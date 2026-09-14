from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text

from src.core.database import execute_raw, get_by_id, get_raw_pool, update_record
from src.core.dependencies import (
    require_notification_admin,
    require_notification_read,
)
from src.core.notif_service import send_custom_notifications

router = APIRouter()


class TemplateUpdate(BaseModel):
    label: str | None = None
    channel: str | None = None
    email_subject: str | None = None
    body: str | None = None
    is_active: bool | None = None


class CustomSend(BaseModel):
    recipient_user_ids: list[str]
    channel: str = "both"
    subject: str = ""
    body: str


@router.get("/templates")
def get_templates(user: dict = Depends(require_notification_read)):
    rows = execute_raw("SELECT * FROM notification_templates ORDER BY event_key ASC")
    return rows


@router.get("/templates/{id}")
def get_template(id: str, user: dict = Depends(require_notification_read)):
    row = get_by_id("notification_templates", id)
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    return row


@router.put("/templates/{id}")
def update_template(
    id: str, body: TemplateUpdate, user: dict = Depends(require_notification_admin)
):
    data = {
        k: v
        for k, v in {
            "label": body.label,
            "channel": body.channel,
            "email_subject": body.email_subject,
            "body": body.body,
            "is_active": body.is_active,
        }.items()
        if v is not None
    }
    if not data:
        raise HTTPException(status_code=400, detail="Tidak ada field untuk diubah")
    updated = update_record("notification_templates", id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Template not found")
    return updated


@router.post("/send")
def send_custom(body: CustomSend, user: dict = Depends(require_notification_admin)):
    if not body.body.strip():
        raise HTTPException(status_code=400, detail="Body pesan tidak boleh kosong")
    if not body.recipient_user_ids:
        raise HTTPException(status_code=400, detail="Pilih minimal satu penerima")
    if body.channel not in ("email", "whatsapp", "both"):
        raise HTTPException(status_code=400, detail="Channel tidak valid")

    result = send_custom_notifications(
        recipient_user_ids=body.recipient_user_ids,
        channel=body.channel,
        subject=body.subject,
        body=body.body,
    )
    return {"message": "Notifikasi terkirim (simulasi)", **result}


@router.get("/logs")
def get_logs(
    page: int = Query(1),
    perPage: int = Query(20),
    status: str | None = Query(None),
    user: dict = Depends(require_notification_read),
):
    offset = (page - 1) * perPage
    sql = "SELECT * FROM notification_logs WHERE 1=1"
    count_sql = "SELECT COUNT(*) as cnt FROM notification_logs WHERE 1=1"
    params: dict = {}

    if status:
        sql += " AND status = :status"
        count_sql += " AND status = :status"
        params["status"] = status

    sql += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    params["limit"] = perPage
    params["offset"] = offset

    pool = get_raw_pool()
    with pool.connect() as conn:
        rows = conn.execute(text(sql), params).mappings().all()
        count_rows = conn.execute(text(count_sql), params).mappings().all()

    return {"data": [dict(r) for r in rows], "total": count_rows[0]["cnt"]}
