import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from src.core.database import (
    audit_log,
    create_record,
    execute_raw,
    get_by_column,
    get_by_id,
    update_record,
)
from src.core.dependencies import get_current_user, require_superadmin
from src.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from src.core.uploads import upload_file
from src.modules.auth.schemas import (
    LoginRequest,
    LoginResponse,
    ProfileUpdate,
    RefreshRequest,
    RefreshResponse,
    RegisterAdminRequest,
    RegisterApplicantRequest,
)

router = APIRouter()

LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15
FAKE_HASH = "$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1QlFZqFOBmH39JcGpGtI7qJkGzS"

WIB = ZoneInfo("Asia/Jakarta")


def to_mysql_datetime(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def validate_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters long")
    if not any(c.isupper() for c in password):
        raise HTTPException(400, "Password must contain at least one uppercase letter")
    if not any(c.islower() for c in password):
        raise HTTPException(400, "Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in password):
        raise HTTPException(400, "Password must contain at least one number")


def _serialize_user(user: dict) -> dict:
    role_id = user.get("role_id")
    role_name = ""
    role_permissions: dict[str, Any] = {}
    is_superadmin = False

    if role_id:
        role = get_by_id("roles", role_id)
        if role:
            role_name = role.get("name", "")
            raw = role.get("permissions")
            role_permissions = json.loads(raw) if isinstance(raw, str) and raw else (raw or {})
            is_superadmin = bool(role.get("is_superadmin"))

    page_rows = execute_raw(
        "SELECT p.`key` FROM user_page_permissions up JOIN pages p ON up.page_id = p.id WHERE up.user_id = :user_id",
        {"user_id": user["id"]},
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
        "page_permissions": [r["key"] for r in page_rows],
        "user_type": user.get("user_type", "admin"),
        "is_superadmin": is_superadmin or user.get("user_type") == "superadmin",
        "is_active": user.get("is_active", True),
    }


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    user = get_by_column("users", "username", body.username) or get_by_column("users", "email", body.username)
    if not user:
        raise HTTPException(401, "Invalid username or password")

    if not user.get("is_active", True):
        raise HTTPException(403, "User is inactive")

    locked_until = user.get("locked_until")
    if locked_until:
        locked_dt = _coerce_dt(locked_until)
        if locked_dt and locked_dt > datetime.now(WIB):
            remaining = max(1, int((locked_dt - datetime.now(WIB)).total_seconds() / 60))
            raise HTTPException(429, f"Account locked. Try again in {remaining} minute(s)")

    stored_hash = user.get("password_hash")
    if not isinstance(stored_hash, str) or not stored_hash.startswith("$2"):
        stored_hash = FAKE_HASH

    if not verify_password(body.password, stored_hash):
        attempts = int(user.get("failed_login_attempts", 0)) + 1
        if attempts >= LOCKOUT_THRESHOLD:
            update_record(
                "users",
                user["id"],
                {
                    "failed_login_attempts": attempts,
                    "locked_until": to_mysql_datetime(datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)),
                },
            )
            raise HTTPException(429, f"Account locked due to {LOCKOUT_THRESHOLD} failed attempts. Try again in {LOCKOUT_MINUTES} minute(s)")
        update_record("users", user["id"], {"failed_login_attempts": attempts})
        raise HTTPException(401, "Invalid username or password")

    update_record(
        "users",
        user["id"],
        {
            "last_login_at": to_mysql_datetime(datetime.now(WIB)),
            "failed_login_attempts": 0,
            "locked_until": None,
        },
    )

    access_token = create_access_token({"sub": user["id"]})
    raw_refresh, refresh_hash, refresh_expires = generate_refresh_token()
    create_record(
        "refresh_tokens",
        {
            "user_id": user["id"],
            "token_hash": refresh_hash,
            "expires_at": to_mysql_datetime(refresh_expires),
        },
    )

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "user": _serialize_user(user),
    }


def _coerce_dt(value):
    """Accept either a naive/datetime or ISO string; returns aware WIB datetime or None."""
    try:
        if isinstance(value, str):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        if isinstance(value, datetime):
            dt = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
            return dt
    except ValueError:
        return None
    return None


@router.post("/refresh", response_model=RefreshResponse)
def refresh(body: RefreshRequest):
    token_hash = hash_refresh_token(body.refresh_token)
    stored = get_by_column("refresh_tokens", "token_hash", token_hash)
    if not stored or stored.get("revoked"):
        raise HTTPException(401, "Invalid refresh token")

    expires = stored.get("expires_at")
    if expires:
        expires_dt = _coerce_dt(expires)
        if expires_dt and expires_dt < datetime.now(WIB):
            raise HTTPException(401, "Refresh token expired")

    user = get_by_id("users", stored.get("user_id"))
    if not user or not user.get("is_active", True):
        raise HTTPException(401, "User not found or inactive")

    update_record("refresh_tokens", stored["id"], {"revoked": True})

    new_access = create_access_token({"sub": user["id"]})
    raw_refresh, new_hash, new_expires = generate_refresh_token()
    create_record(
        "refresh_tokens",
        {
            "user_id": user["id"],
            "token_hash": new_hash,
            "expires_at": to_mysql_datetime(new_expires),
        },
    )

    return {"access_token": new_access, "refresh_token": raw_refresh, "token_type": "bearer"}


@router.get("/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    return _serialize_user(user)


@router.put("/profile")
def update_profile(body: ProfileUpdate, request: Request, user: Dict[str, Any] = Depends(get_current_user)):
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
            raise HTTPException(400, "Old password is required")
        if not verify_password(body.old_password, user.get("password_hash", "")):
            raise HTTPException(400, "Old password is incorrect")
        validate_password(body.new_password)
        data["password_hash"] = hash_password(body.new_password)

    if data.get("email"):
        if user.get("user_type") != "superadmin":
            raise HTTPException(403, "Only superadmin can change email")
        existing = get_by_column("users", "email", data["email"])
        if existing and existing["id"] != user["id"]:
            raise HTTPException(400, "Email already in use")

    if data.get("username"):
        existing = get_by_column("users", "username", data["username"])
        if existing and existing["id"] != user["id"]:
            raise HTTPException(400, "Username already in use")

    if data:
        update_record("users", user["id"], data)

    if body.new_password:
        rows = execute_raw("SELECT id FROM refresh_tokens WHERE user_id = :user_id", {"user_id": user["id"]})
        for row in rows:
            update_record("refresh_tokens", row["id"], {"revoked": True})

    changes = {
        k: {"old": user.get(k), "new": v}
        for k, v in data.items()
        if k != "password_hash" and user.get(k) != v
    }
    audit_log(
        user_id=user["id"],
        user_username=user.get("username"),
        action="update",
        entity_type="auth_profile",
        entity_id=user["id"],
        changes=changes if changes else None,
        ip_address=request.headers.get("x-forwarded-for"),
    )

    return {
        "id": user["id"],
        "username": data.get("username", user.get("username")),
        "email": data.get("email", user.get("email", "")),
        "full_name": data.get("full_name", user.get("full_name", "")),
        "avatar_url": data.get("avatar_url", user.get("avatar_url", "")),
        "role_id": user.get("role_id"),
        "user_type": user.get("user_type", "admin"),
        "is_active": user.get("is_active", True),
    }


@router.post("/register-applicant")
def register_applicant(body: RegisterApplicantRequest, request: Request):
    validate_password(body.password)

    if get_by_column("users", "username", body.username):
        raise HTTPException(400, "Username already exists")
    if get_by_column("users", "email", body.email):
        raise HTTPException(400, "Email already exists")

    role = get_by_column("roles", "name", "Calon Murid")
    if not role:
        raise HTTPException(500, "Default applicant role not found. Run seed first.")

    user_id = str(uuid.uuid4())
    user = create_record(
        "users",
        {
            "id": user_id,
            "username": body.username,
            "email": body.email,
            "full_name": body.full_name,
            "password_hash": hash_password(body.password),
            "role_id": role["id"],
            "user_type": "calon_murid",
            "is_active": True,
        },
    )

    access_token = create_access_token({"sub": user["id"]})
    raw_refresh, refresh_hash, refresh_expires = generate_refresh_token()
    create_record(
        "refresh_tokens",
        {
            "user_id": user["id"],
            "token_hash": refresh_hash,
            "expires_at": to_mysql_datetime(refresh_expires),
        },
    )

    audit_log(
        user_id=user["id"],
        user_username=body.username,
        action="register",
        entity_type="applicant",
        entity_id=user["id"],
        ip_address=request.headers.get("x-forwarded-for"),
    )

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user.get("email", ""),
            "full_name": user.get("full_name", ""),
            "role_id": role["id"],
            "role_name": role["name"],
            "user_type": "calon_murid",
        },
    }


@router.post("/register")
def register_admin(body: RegisterAdminRequest, user: Dict[str, Any] = Depends(require_superadmin)):
    validate_password(body.password)

    if get_by_column("users", "username", body.username):
        raise HTTPException(400, "Username already exists")

    new_user = create_record(
        "users",
        {
            "username": body.username,
            "password_hash": hash_password(body.password),
            "role_id": body.role_id,
            "user_type": body.user_type or "admin",
            "is_active": True,
        },
    )

    token = create_access_token({"sub": new_user["id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": new_user["id"], "username": new_user["username"]},
    }


@router.post("/logout")
def logout(user: Dict[str, Any] = Depends(get_current_user)):
    execute_raw("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = :user_id", {"user_id": user["id"]})
    return {"message": "Logged out"}


@router.post("/upload")
async def upload(user: Dict[str, Any] = Depends(get_current_user), file: UploadFile = File(...)):
    result = await upload_file(file)
    record = create_record(
        "file_uploads",
        {
            "uploaded_by": user["id"],
            "original_name": result.original_name,
            "stored_name": result.storage_path.split("/")[-1],
            "mime_type": result.mime_type,
            "size_bytes": result.size_bytes,
            "storage_path": result.storage_path,
            "public_url": result.public_url,
        },
    )
    return {"url": result.public_url, "id": record.get("id")}
