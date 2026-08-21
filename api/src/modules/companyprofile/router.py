import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.core.database import (
    create_record,
    delete_record,
    execute_raw,
    get_by_column,
    get_first,
    get_by_id,
    get_by_slug,
    list_all,
    update_record,
)
from src.core.dependencies import get_current_user, require_cp_crud
from src.core.events import companyprofile_hub
from src.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from src.core.uploads import upload_file, delete_upload

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
    "favicon", "site_name", "site_description", "logo",
    "whatsapp", "whatsapp_message", "whatsapp_message_en", "whatsapp_message_id",
}

ADMIN_SETTINGS_KEYS = PUBLIC_SETTINGS_KEYS | {
    "whatsapp_number", "to_email",
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


def _parse_permissions(raw) -> dict:
    import json

    if isinstance(raw, str):
        try:
            return json.loads(raw) if raw else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    if isinstance(raw, dict):
        return raw
    return {}


# ---------------------------------------------------------------------------
# Auth endpoints used by the companyprofile admin dashboard
# ---------------------------------------------------------------------------

class LoginReq(BaseModel):
    username: str
    password: str


class RefreshReq(BaseModel):
    refresh_token: str


class ProfileUpdateReq(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    old_password: Optional[str] = None
    new_password: Optional[str] = None


@router.post("/auth/login")
async def cp_login(body: LoginReq):
    from src.core.dependencies import AccessLevel, Module, has_module_access

    user = get_by_column("users", "username", body.username)
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    role = get_by_id("roles", user["role_id"]) if user.get("role_id") else None
    user["role_permissions"] = _parse_permissions(role["permissions"] if role else None)
    if not await has_module_access(user, Module.COMPANYPROFILE, AccessLevel.DASHBOARD):
        raise HTTPException(status_code=403, detail="Access denied")

    access_token = create_access_token({"sub": user["id"]})
    raw_refresh, new_hash, expires_at = generate_refresh_token()
    create_record(
        "refresh_tokens",
        {
            "user_id": user["id"],
            "token_hash": new_hash,
            "expires_at": expires_at.strftime("%Y-%m-%d %H:%M:%S"),
            "revoked": False,
        },
    )

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role_id": user.get("role_id"),
            "user_type": user.get("user_type", "admin"),
        },
    }


@router.post("/auth/refresh")
async def cp_refresh(body: RefreshReq):
    token_hash = hash_refresh_token(body.refresh_token)
    stored = get_by_column("refresh_tokens", "token_hash", token_hash)
    if not stored or stored.get("revoked"):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = get_by_id("users", stored["user_id"])
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="User not found or inactive")

    update_record("refresh_tokens", stored["id"], {"revoked": True})
    new_access = create_access_token({"sub": user["id"]})
    raw_refresh, new_hash, new_expires = generate_refresh_token()
    create_record(
        "refresh_tokens",
        {
            "user_id": user["id"],
            "token_hash": new_hash,
            "expires_at": new_expires.strftime("%Y-%m-%d %H:%M:%S"),
            "revoked": False,
        },
    )
    return {"access_token": new_access, "refresh_token": raw_refresh, "token_type": "bearer"}


@router.post("/auth/logout")
async def cp_logout(user: Dict[str, Any] = Depends(get_current_user)):
    execute_raw("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = :uid", {"uid": user["id"]})
    return {"message": "Logged out"}


@router.get("/auth/me")
async def cp_me(user: Dict[str, Any] = Depends(get_current_user)):
    import json

    role_name = ""
    role_permissions: dict = {}
    is_superadmin = False
    role_id = user.get("role_id")
    if role_id:
        role = get_by_id("roles", role_id)
        if role:
            role_name = role.get("name", "")
            raw = role.get("permissions")
            role_permissions = json.loads(raw) if isinstance(raw, str) and raw else (raw or {})
            is_superadmin = bool(role.get("is_superadmin"))

    page_rows = execute_raw(
        "SELECT page_id FROM user_page_permissions WHERE user_id = :uid", {"uid": user["id"]}
    )
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user.get("email", ""),
        "full_name": user.get("full_name", ""),
        "avatar_url": user.get("avatar_url", ""),
        "role_id": role_id,
        "role_name": role_name,
        "permissions": role_permissions,
        "page_permissions": [r["page_id"] for r in page_rows] if page_rows else [],
        "user_type": user.get("user_type", "admin"),
        "is_active": user.get("is_active", True),
        "is_superadmin": is_superadmin or user.get("user_type") == "superadmin",
    }


@router.put("/auth/profile")
async def cp_profile(body: ProfileUpdateReq, user: Dict[str, Any] = Depends(get_current_user)):
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
            raise HTTPException(status_code=403, detail="Only superadmin can change email")
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
        execute_raw("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = :uid", {"uid": user["id"]})

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
async def cp_upload(request: Request, user: Dict[str, Any] = Depends(require_cp_crud()), file: UploadFile = File(...)):
    record_id = str(uuid.uuid4())
    result = await upload_file(file, record_id)
    record = create_record(
        "file_uploads",
        {
            "id": record_id,
            "uploaded_by": user["id"],
            "original_name": result.original_name,
            "stored_name": result.storage_path.split("/")[-1],
            "mime_type": result.mime_type,
            "size_bytes": result.size_bytes,
            "storage_path": result.storage_path,
            "public_url": result.public_url,
        },
    )
    url = result.public_url
    if url.startswith("/"):
        url = f"{request.base_url}{url.lstrip('/')}"
    return {"url": url, "id": record.get("id")}


@router.delete("/uploads/{filename}")
async def cp_delete_upload(filename: str, user: Dict[str, Any] = Depends(require_cp_crud())):
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
async def cp_settings_list():
    all_settings = list_all("site_settings")
    return [s for s in all_settings if s["key"] in PUBLIC_SETTINGS_KEYS]


@router.get("/settings/{key}")
async def cp_settings_get(key: str):
    if key not in PUBLIC_SETTINGS_KEYS:
        raise HTTPException(status_code=400, detail=f"Unknown key: {key}")
    setting = get_by_column("site_settings", "key", key)
    if not setting:
        raise HTTPException(status_code=404, detail="Not found")
    return setting


class SettingUpdateReq(BaseModel):
    value: str


@router.put("/settings/{key}")
async def cp_settings_update(key: str, body: SettingUpdateReq, user: Dict[str, Any] = Depends(require_cp_crud())):
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
    phone_primary: Optional[str] = None
    phone_secondary: Optional[str] = None
    whatsapp: Optional[str] = None
    email_primary: Optional[str] = None
    email_admission: Optional[str] = None
    address: Optional[str] = None
    office_hours: Optional[str] = None


@router.get("/contact-info")
async def cp_contact_info():
    info = get_first("contact_info")
    if not info:
        raise HTTPException(status_code=404, detail="Not found")
    return info


@router.put("/contact-info")
async def cp_contact_update(body: ContactInfoUpdateReq, user: Dict[str, Any] = Depends(require_cp_crud())):
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
async def cp_entity_list(entity: str, skip: int = 0, limit: int = 100):
    if entity in ("settings", "contact-info", "auth", "upload", "events"):
        return []
    table = get_table(entity)
    order = "date.desc" if entity == "news" else ("year.desc" if entity == "achievements" else None)
    return list_all(table, order=order, skip=skip, limit=limit)


@router.get("/{entity}/{slug}")
async def cp_entity_get(entity: str, slug: str):
    if entity in ("settings", "contact-info"):
        return None
    table = get_table(entity)
    if entity in ("news", "programs"):
        item = get_by_slug(table, slug)
    else:
        item = get_by_id(table, slug)
    if not item:
        raise HTTPException(status_code=404, detail=f"{entity} not found")
    return item


@router.post("/{entity}")
async def cp_entity_create(entity: str, request: Request, user: Dict[str, Any] = Depends(require_cp_crud())):
    body = await request.json()
    record = create_record(get_table(entity), body)
    companyprofile_hub.broadcast()
    return record


@router.put("/{entity}/{id}")
async def cp_entity_update(entity: str, id: str, request: Request, user: Dict[str, Any] = Depends(require_cp_crud())):
    table = get_table(entity)
    if not get_by_id(table, id):
        raise HTTPException(status_code=404, detail=f"{entity} not found")
    body = await request.json()
    record = update_record(table, id, body)
    companyprofile_hub.broadcast()
    return record


@router.delete("/{entity}/{id}")
async def cp_entity_delete(entity: str, id: str, user: Dict[str, Any] = Depends(require_cp_crud())):
    table = get_table(entity)
    if not get_by_id(table, id):
        raise HTTPException(status_code=404, detail=f"{entity} not found")
    delete_record(table, id)
    companyprofile_hub.broadcast()
    return {"message": "Deleted"}
