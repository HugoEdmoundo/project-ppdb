"""File upload service.

`UPLOAD_PROVIDER=local` saves to a local folder.
"""
import logging
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile

from src.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

PUBLIC_ID_PREFIX = "uploads"


@dataclass
class UploadResult:
    public_url: str
    storage_path: str
    original_name: str
    mime_type: str
    size_bytes: int
    data: Optional[bytes] = field(default=None)


def _validate(file: UploadFile) -> None:
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File type not allowed. Accepted: JPEG, PNG, WebP, GIF, PDF",
        )


async def _read_with_limit(file: UploadFile) -> bytes:
    content = await file.read(MAX_SIZE_BYTES + 1)
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")
    return content


def _upload_cloudinary(content: bytes, original_name: str, content_type: str) -> UploadResult:
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

    folder = f"{PUBLIC_ID_PREFIX}/{settings.cloudinary_folder.strip('/')}" if settings.cloudinary_folder else PUBLIC_ID_PREFIX
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


def _upload_db(content: bytes, original_name: str, content_type: str, record_id: str) -> UploadResult:
    """Store file bytes in the file_uploads.data column (served via GET /uploads/{id})."""
    ext = Path(original_name).suffix or ".bin"
    return UploadResult(
        public_url=f"/uploads/{record_id}",
        storage_path=f"db://{record_id}",
        original_name=original_name,
        mime_type=content_type,
        size_bytes=len(content),
        data=content,
    )


def _upload_local(content: bytes, original_name: str, content_type: str) -> UploadResult:
    base = Path(settings.upload_dir)
    base.mkdir(parents=True, exist_ok=True)
    ext = Path(original_name).suffix or ".bin"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    (base / stored_name).write_bytes(content)
    return UploadResult(
        public_url=f"/uploads/{stored_name}",
        storage_path=str(base / stored_name),
        original_name=original_name,
        mime_type=content_type,
        size_bytes=len(content),
    )


async def upload_file(file: UploadFile, record_id: Optional[str] = None) -> UploadResult:
    _validate(file)
    content = await _read_with_limit(file)
    original_name = file.filename or "file"

    provider = settings.upload_provider
    if provider == "cloudinary" and not settings.cloudinary_configured:
        logger.warning("Cloudinary not configured, falling back to local storage")
        provider = "local"

    if provider == "cloudinary":
        result = _upload_cloudinary(content, original_name, file.content_type or "application/octet-stream")
    elif provider == "db":
        if not record_id:
            raise HTTPException(status_code=500, detail="db storage requires a record id")
        result = _upload_db(content, original_name, file.content_type or "application/octet-stream", record_id)
    else:
        result = _upload_local(content, original_name, file.content_type or "application/octet-stream")

    logger.info("Uploaded %s -> %s", original_name, result.public_url)
    return result


def delete_upload(storage_path: str) -> None:
    """Delete a previously uploaded asset (by Cloudinary public_id or local path)."""
    if not storage_path:
        return
    if storage_path.startswith("db://"):
        # Stored inside file_uploads.data; row cleanup is handled by the caller.
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
