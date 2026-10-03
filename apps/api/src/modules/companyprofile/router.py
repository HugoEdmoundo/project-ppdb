import asyncio
import uuid
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.database import (
    create_record,
    delete_record,
    execute_raw,
    get_by_column,
    get_by_id,
    get_by_slug,
    get_db,
    get_first,
    list_all,
    update_record,
)
from src.core.dependencies import get_current_user, require_cp_crud
from src.core.events import companyprofile_hub
from src.core.request_body import read_refresh_token
from src.core.security import hash_password, verify_password
from src.core.uploads import delete_upload, upload_file
from src.repositories.auth_repository import AuthRepository
from src.services.auth_service import AuthService

router = APIRouter()

TABLES = {
    "news": "news_articles",
    "programs": "programs",
    "facilities": "facilities",
    "staff": "staff",
    "achievements": "achievements",
    "gallery": "gallery_items",
    "social-links": "social_links",
    "testimonials": "testimonials",
}

PUBLIC_SETTINGS_KEYS = {
    "favicon",
    "site_description",
    "logo",
    "whatsapp",
    "whatsapp_message",
    "whatsapp_message_en",
    "whatsapp_message_id",
}

ADMIN_SETTINGS_KEYS = PUBLIC_SETTINGS_KEYS | {
    "whatsapp_number",
    "to_email",
}


def get_table(entity: str) -> str:
    table = TABLES.get(entity)
    if not table:
        raise HTTPException(status_code=400, detail=f"Unknown entity: {entity}")
    return table


# ---------------------------------------------------------------------------
# SSE: live favicon/settings updates
# ---------------------------------------------------------------------------


@router.get("/events")
async def cp_events(request: Request) -> StreamingResponse:
    return await companyprofile_hub.stream(request)


def _parse_permissions(raw) -> dict[str, Any]:
    import json

    if isinstance(raw, str):
        try:
            if raw:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    return parsed
            return {}
        except (json.JSONDecodeError, TypeError):
            return {}
    if isinstance(raw, dict):
        return raw
    return {}


# ---------------------------------------------------------------------------
# Auth endpoints used by the companyprofile admin dashboard
# ---------------------------------------------------------------------------


def _cookie_secure(request: Request) -> bool:
    if settings.cookie_secure:
        return True
    forwarded = (request.headers.get("x-forwarded-proto") or "").lower()
    return forwarded == "https"


class LoginReq(BaseModel):
    username: str
    password: str


class RefreshReq(BaseModel):
    refresh_token: str | None = None


class ProfileUpdateReq(BaseModel):
    username: str | None = None
    email: str | None = None
    full_name: str | None = None
    avatar_url: str | None = None
    old_password: str | None = None
    new_password: str | None = None


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    repo = AuthRepository(db)
    return AuthService(repo)


def _strip_permission_fields(user: dict) -> dict:
    """Keep login/me payload contract for the companyprofile admin dashboard."""
    return {
        k: v for k, v in user.items() if k not in ("payment_status", "payment_deadline")
    }


@router.post("/auth/login")
async def cp_login(
    body: LoginReq,
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service),
):
    from src.core.dependencies import AccessLevel, Module, has_module_access

    result = await asyncio.to_thread(service.login, body.username, body.password)
    user = result["user"]

    # Per-user profile overrides need the raw users row (has_module_access
    # reads user["profile"]); enrich from DB so overrides keep working.
    raw_user = await asyncio.to_thread(get_by_id, "users", user["id"]) or {}
    raw_user["role_permissions"] = user.get("permissions", {})
    raw_user["permissions"] = user.get("permissions", {})
    raw_user["is_superadmin"] = user.get("is_superadmin", False)

    if not await has_module_access(
        raw_user, Module.COMPANYPROFILE, AccessLevel.DASHBOARD
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    secure = _cookie_secure(request)
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        samesite="lax",
        secure=secure,
    )
    if result.get("refresh_token"):
        response.set_cookie(
            key="refresh_token",
            value=result["refresh_token"],
            httponly=True,
            samesite="lax",
            secure=secure,
            max_age=30 * 24 * 60 * 60,
        )

    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": "bearer",
        "user": _strip_permission_fields(user),
    }


@router.post("/auth/refresh")
def cp_refresh(
    request: Request,
    response: Response,
    body: RefreshReq | None = None,
    service: AuthService = Depends(get_auth_service),
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token and body and body.refresh_token:
        refresh_token = body.refresh_token
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    result = service.refresh(refresh_token)
    secure = _cookie_secure(request)
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        samesite="lax",
        secure=secure,
    )
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        samesite="lax",
        secure=secure,
        max_age=30 * 24 * 60 * 60,
    )
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": "bearer",
    }


@router.post("/auth/logout")
async def cp_logout(
    request: Request,
    response: Response,
    user: dict[str, Any] = Depends(get_current_user),
):
    # Body dibaca manual (bukan Pydantic body param): logout tidak boleh gagal
    # hanya karena Content-Type request salah — kalau 422, refresh token tidak
    # dicabut dan cookie httpOnly tetap hidup di browser.
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        refresh_token = await read_refresh_token(request)
    if refresh_token:
        execute_raw(
            "UPDATE refresh_tokens SET revoked = 1 WHERE user_id = :uid",
            {"uid": user["id"]},
        )
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    return {"message": "Logged out"}


@router.get("/auth/me")
def cp_me(
    user: dict[str, Any] = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    # `service.get_me()` serializes page_permissions as page KEYS, the same
    # contract the PPDB admin nav and the Company Profile admin tabs consume.
    return service.get_me(user)


@router.put("/auth/profile")
def cp_profile(
    body: ProfileUpdateReq, user: dict[str, Any] = Depends(get_current_user)
):
    data: dict[str, Any] = {}
    if body.username is not None:
        data["username"] = body.username
    if body.email is not None:
        data["email"] = body.email
    if body.full_name is not None:
        data["full_name"] = body.full_name
    if body.avatar_url is not None:
        data["avatar_url"] = body.avatar_url

    if body.new_password:
        if not body.old_password:
            raise HTTPException(status_code=400, detail="Old password is required")
        if not verify_password(body.old_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Old password is incorrect")
        data["password_hash"] = hash_password(body.new_password)

    if "email" in data and data["email"] != user.get("email", ""):
        if user.get("user_type") != "superadmin" and not user.get("is_superadmin"):
            raise HTTPException(
                status_code=403, detail="Only superadmin can change email"
            )
        existing = get_by_column("users", "email", data["email"])
        if existing and existing["id"] != user["id"]:
            raise HTTPException(status_code=400, detail="Email already in use")

    if "username" in data:
        existing = get_by_column("users", "username", data["username"])
        if existing and existing["id"] != user["id"]:
            raise HTTPException(status_code=400, detail="Username already in use")

    if data:
        update_record("users", user["id"], data)

    if body.new_password:
        execute_raw(
            "UPDATE refresh_tokens SET revoked = 1 WHERE user_id = :uid",
            {"uid": user["id"]},
        )

    return {
        "id": user["id"],
        "username": data.get("username", user["username"]),
        "email": data.get("email", user.get("email", "")),
        "full_name": data.get("full_name", user.get("full_name", "")),
        "avatar_url": data.get("avatar_url", user.get("avatar_url", "")),
        "role_id": user.get("role_id"),
        "user_type": user.get("user_type", "admin"),
        "is_active": user.get("is_active", True),
    }


# ---------------------------------------------------------------------------
# Uploads (Cloudinary)
# ---------------------------------------------------------------------------


@router.post("/upload")
async def cp_upload(
    request: Request,
    user: dict[str, Any] = Depends(require_cp_crud()),
    file: UploadFile = File(...),
):
    record_id = str(uuid.uuid4())
    result = await upload_file(file, record_id)
    if result.public_url.startswith("/uploads/"):
        stored_name = result.public_url.rsplit("/", 1)[-1]
    else:
        stored_name = result.storage_path.split("/")[-1]
    record = await asyncio.to_thread(
        create_record,
        "file_uploads",
        {
            "id": record_id,
            "uploaded_by": user["id"],
            "original_name": result.original_name,
            "stored_name": stored_name,
            "mime_type": result.mime_type,
            "size_bytes": result.size_bytes,
            "storage_path": result.storage_path,
            "public_url": result.public_url,
            "data": result.data,
        },
    )
    url = result.public_url
    if url.startswith("/"):
        url = f"{request.base_url}{url.lstrip('/')}"
    return {"url": url, "id": record.get("id")}


@router.delete("/uploads/{filename}")
def cp_delete_upload(filename: str, user: dict[str, Any] = Depends(require_cp_crud())):
    if not filename or ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    record = get_by_column("file_uploads", "stored_name", filename)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    delete_upload(record["storage_path"])
    delete_record("file_uploads", record["id"])
    return {"message": "Deleted"}


# ---------------------------------------------------------------------------
# Settings & contact info
# ---------------------------------------------------------------------------


@router.get("/settings")
def cp_settings_list():
    all_settings = list_all("site_settings")
    return [s for s in all_settings if s["key"] in PUBLIC_SETTINGS_KEYS]


@router.get("/settings-admin")
def cp_settings_admin_list(
    user: dict[str, Any] = Depends(require_cp_crud()),
):
    """Semua kunci settings termasuk admin-only (whatsapp_number, to_email).

    Dipakai dashboard admin agar nilai yang disimpan via PUT bisa dibaca kembali.
    """
    all_settings = list_all("site_settings")
    return [s for s in all_settings if s["key"] in ADMIN_SETTINGS_KEYS]


@router.get("/settings/{key}")
def cp_settings_get(key: str):
    if key not in PUBLIC_SETTINGS_KEYS:
        raise HTTPException(status_code=400, detail=f"Unknown key: {key}")
    setting = get_by_column("site_settings", "key", key)
    if not setting:
        raise HTTPException(status_code=404, detail="Not found")
    return setting


class SettingUpdateReq(BaseModel):
    value: str


@router.put("/settings/{key}")
def cp_settings_update(
    key: str, body: SettingUpdateReq, user: dict[str, Any] = Depends(require_cp_crud())
):
    if key not in ADMIN_SETTINGS_KEYS:
        raise HTTPException(status_code=400, detail=f"Unknown key: {key}")
    existing = get_by_column("site_settings", "key", key)
    if existing:
        record = update_record("site_settings", existing["key"], {"value": body.value})
    else:
        record = create_record("site_settings", {"key": key, "value": body.value})
    companyprofile_hub.broadcast()
    return record


class ContactInfoUpdateReq(BaseModel):
    phone_primary: str | None = None
    phone_secondary: str | None = None
    whatsapp: str | None = None
    email_primary: str | None = None
    email_admission: str | None = None
    address: str | None = None
    office_hours: str | None = None


@router.get("/contact-info")
def cp_contact_info():
    info = get_first("contact_info")
    if not info:
        raise HTTPException(status_code=404, detail="Not found")
    return info


@router.put("/contact-info")
def cp_contact_update(
    body: ContactInfoUpdateReq, user: dict[str, Any] = Depends(require_cp_crud())
):
    existing = get_first("contact_info")
    data = body.model_dump(exclude_unset=True)
    if existing:
        update_record("contact_info", existing["id"], data)
        return get_by_id("contact_info", existing["id"])
    return create_record("contact_info", data)


# ---------------------------------------------------------------------------
# Generic entity CRUD
# ---------------------------------------------------------------------------


@router.get("/{entity}")
def cp_entity_list(entity: str, skip: int = 0, limit: int = 100):
    if entity in ("settings", "contact-info", "auth", "upload", "events"):
        raise HTTPException(status_code=404, detail="Not found")
    table = get_table(entity)
    order = (
        "date.desc"
        if entity == "news"
        else ("year.desc" if entity == "achievements" else None)
    )
    items = list_all(table, order=order, skip=skip, limit=limit)

    import json

    for item in items:
        # Strip heavy rich-text content for list view
        if "content" in item and isinstance(item["content"], str):
            try:
                c_data = json.loads(item["content"])
                if isinstance(c_data, dict) and "content" in c_data:
                    c_data.pop("content", None)
                    item["content"] = json.dumps(c_data, ensure_ascii=False)
            except Exception:
                pass

        # Strip gallery arrays for list view
        if "gallery" in item:
            item["gallery"] = None

    return items


@router.get("/{entity}/{slug}")
def cp_entity_get(entity: str, slug: str):
    if entity in ("settings", "contact-info"):
        raise HTTPException(status_code=404, detail="Not found")
    table = get_table(entity)
    if entity in ("news", "programs"):
        item = get_by_slug(table, slug)
    else:
        item = get_by_id(table, slug)
    if not item:
        raise HTTPException(status_code=404, detail=f"{entity} not found")
    return item


@router.post("/{entity}")
async def cp_entity_create(
    entity: str, request: Request, user: dict[str, Any] = Depends(require_cp_crud())
):
    from src.modules.companyprofile.schemas import sanitize_entity_payload

    body = await request.json()
    table = get_table(entity)
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Request body must be an object")
    try:
        payload = sanitize_entity_payload(entity, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    record = await asyncio.to_thread(create_record, table, payload)
    companyprofile_hub.broadcast()
    return record


@router.put("/{entity}/{id}")
async def cp_entity_update(
    entity: str,
    id: str,
    request: Request,
    user: dict[str, Any] = Depends(require_cp_crud()),
):
    from src.modules.companyprofile.schemas import sanitize_entity_payload

    table = get_table(entity)
    if not await asyncio.to_thread(get_by_id, table, id):
        raise HTTPException(status_code=404, detail=f"{entity} not found")
    body = await request.json()
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Request body must be an object")
    try:
        payload = sanitize_entity_payload(entity, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    record = await asyncio.to_thread(update_record, table, id, payload)
    companyprofile_hub.broadcast()
    return record


@router.delete("/{entity}/{id}")
def cp_entity_delete(
    entity: str, id: str, user: dict[str, Any] = Depends(require_cp_crud())
):
    table = get_table(entity)
    if not get_by_id(table, id):
        raise HTTPException(status_code=404, detail=f"{entity} not found")
    delete_record(table, id)
    companyprofile_hub.broadcast()
    return {"message": "Deleted"}
