"""File upload service.

`UPLOAD_PROVIDER=local` saves to a local folder.
`UPLOAD_PROVIDER=cloudinary` uploads to Cloudinary (falls back to local when
Cloudinary is not configured).
`UPLOAD_PROVIDER=db` stores the bytes in the `file_uploads.data` column (served
via `GET /uploads/{id}`).
"""

import logging
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile

from src.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

# Magic bytes per allowed MIME type. Content-type header from the client is
# never trusted: the actual bytes are sniffed and must match the declared type.
_MAGIC: dict[str, bytes] = {
    "image/jpeg": b"\xff\xd8\xff",
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/webp": b"RIFF",
    "image/gif": b"GIF8",
    "application/pdf": b"%PDF-",
}

# Safe extension derived from the *sniffed* type — never from the user-supplied
# filename (an attacker could name a file ".svg" to smuggle active content).
_TYPE_EXT: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
}

PUBLIC_ID_PREFIX = "uploads"


@dataclass
class UploadResult:
    public_url: str
    storage_path: str
    original_name: str
    mime_type: str
    size_bytes: int
    data: bytes | None = None


def _is_webp(content: bytes) -> bool:
    return len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"


def _sniff_type(content: bytes) -> str | None:
    """Return the MIME type matching the file's magic bytes, or None."""
    for mime, magic in _MAGIC.items():
        if content.startswith(magic):
            if mime == "image/webp" and not _is_webp(content):
                continue
            return mime
    return None


def _validate(
    content: bytes, filename: str | None, content_type: str | None
) -> tuple[str, str]:
    """Validate declared type + magic bytes + extension.

    Returns ``(detected_mime, safe_extension)``.
    """
    if not content:
        raise HTTPException(status_code=400, detail="File kosong atau tidak valid")
    declared = (content_type or "").lower()
    if not filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    if declared not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File type not allowed. Accepted: JPEG, PNG, WebP, GIF, PDF",
        )
    detected = _sniff_type(content)
    if detected is None or detected != declared:
        raise HTTPException(
            status_code=400,
            detail="Isi file tidak sesuai dengan tipe yang dinyatakan",
        )
    ext = Path(filename).suffix.lower()
    if not ext or ext not in set(_TYPE_EXT.values()):
        raise HTTPException(
            status_code=400,
            detail=(
                "Ekstensi file tidak diizinkan. "
                "Accepted: .jpg, .png, .webp, .gif, .pdf"
            ),
        )
    return detected, _TYPE_EXT[detected]


async def _read_with_limit(file: UploadFile) -> bytes:
    content = await file.read(MAX_SIZE_BYTES + 1)
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")
    return bytes(content)


def _upload_cloudinary(
    content: bytes, original_name: str, content_type: str
) -> UploadResult:
    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=settings.cloudinary_secure,
        )
    except ImportError:
        raise HTTPException(status_code=500, detail="Upload provider not installed")

    folder = (
        f"{PUBLIC_ID_PREFIX}/{settings.cloudinary_folder.strip('/')}"
        if settings.cloudinary_folder
        else PUBLIC_ID_PREFIX
    )
    public_id = f"{folder}/{uuid.uuid4().hex}"
    result = cloudinary.uploader.upload(
        content,
        public_id=public_id,
        folder=None,  # public_id already contains the folder path
        resource_type="auto",
        use_filename=False,
        overwrite=False,
    )

    return UploadResult(
        public_url=result.get("secure_url") or result.get("url"),
        storage_path=result.get("public_id"),
        original_name=original_name,
        mime_type=content_type,
        size_bytes=len(content),
    )


def _upload_local(
    content: bytes, original_name: str, content_type: str, safe_ext: str = ".bin"
) -> UploadResult:
    base = Path(settings.upload_dir)
    base.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{safe_ext}"
    (base / stored_name).write_bytes(content)
    return UploadResult(
        public_url=f"/uploads/{stored_name}",
        storage_path=str(base / stored_name),
        original_name=original_name,
        mime_type=content_type,
        size_bytes=len(content),
    )


def _upload_db(
    content: bytes, original_name: str, content_type: str, record_id: str
) -> UploadResult:
    return UploadResult(
        public_url=f"/uploads/{record_id}",
        storage_path=f"db://{record_id}",
        original_name=original_name,
        mime_type=content_type,
        size_bytes=len(content),
        data=content,
    )


async def upload_file(file: UploadFile, record_id: str | None = None) -> UploadResult:
    content = await _read_with_limit(file)
    original_name = file.filename or "file"
    detected_type, safe_ext = _validate(content, file.filename, file.content_type)

    provider = settings.upload_provider
    if provider == "cloudinary" and not settings.cloudinary_configured:
        logger.warning("Cloudinary not configured, falling back to local storage")
        provider = "local"

    if provider == "cloudinary":
        result = _upload_cloudinary(content, original_name, detected_type)
    elif provider == "db":
        if not record_id:
            raise HTTPException(
                status_code=500, detail="db upload requires a record id"
            )
        result = _upload_db(content, original_name, detected_type, record_id)
    else:
        result = _upload_local(content, original_name, detected_type, safe_ext)

    logger.info("Uploaded %s -> %s", original_name, result.public_url)
    return result


def delete_upload(storage_path: str) -> None:
    """Delete a previously uploaded asset (by Cloudinary public_id or local path)."""
    if not storage_path:
        return
    if storage_path.startswith("db://"):
        return
    if settings.upload_provider == "cloudinary" and settings.cloudinary_configured:
        try:
            import cloudinary
            import cloudinary.api

            cloudinary.config(
                cloud_name=settings.cloudinary_cloud_name,
                api_key=settings.cloudinary_api_key,
                api_secret=settings.cloudinary_api_secret,
                secure=settings.cloudinary_secure,
            )
            cloudinary.api.delete_resources([storage_path])
        except Exception:
            logger.exception("Cloudinary delete failed for %s", storage_path)
        return

    try:
        Path(storage_path).unlink(missing_ok=True)
    except OSError:
        logger.exception("Local delete failed for %s", storage_path)
