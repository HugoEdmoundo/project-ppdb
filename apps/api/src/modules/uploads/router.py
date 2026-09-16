"""Public file serving for DB-backed uploads (UPLOAD_PROVIDER=db).

Files are stored inside file_uploads.data and served from here so the API
works on serverless runtimes (Vercel) without Cloudinary or local disk.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from src.core.database import get_by_id

router = APIRouter()


@router.get("/uploads/{file_id}")
def get_uploaded_file(file_id: str):
    record = get_by_id("file_uploads", file_id)
    if not record or not record.get("data"):
        raise HTTPException(status_code=404, detail="File not found")
    name = (record.get("original_name") or "file").replace("\r", "").replace("\n", "")
    return Response(
        content=record["data"],
        media_type=record.get("mime_type") or "application/octet-stream",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": f'attachment; filename="{name}"',
        },
    )
