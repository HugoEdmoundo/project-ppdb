from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from typing import Dict, Any
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from src.core.database import (
    get_by_column, get_by_id, create_record, update_record,
    audit_log, execute_raw
)
from src.core.security import (
    hash_password, verify_password, create_access_token,
    generate_refresh_token, hash_refresh_token
)
from src.modules.auth.schemas import (
    LoginRequest, LoginResponse, RefreshRequest, RefreshResponse,
    ProfileUpdate, RegisterApplicantRequest, RegisterAdminRequest
)
from src.modules.auth.dependencies import get_current_user

router = APIRouter()

LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15
FAKE_HASH = '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1QlFZqFOBmH39JcGpGtI7qJkGzS'

WIB = ZoneInfo("Asia/Jakarta")

def to_mysql_datetime(dt: datetime) -> str:
    return dt.strftime('%Y-%m-%d %H:%M:%S')

def validate_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters long")
    if not any(c.isupper() for c in password):
        raise HTTPException(400, "Password must contain at least one uppercase letter")
    if not any(c.islower() for c in password):
        raise HTTPException(400, "Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in password):
        raise HTTPException(400, "Password must contain at least one number")

@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    user = get_by_column("users", "username", body.username)
    if not user:
        user = get_by_column("users", "email", body.username)
        
    if not user:
        raise HTTPException(401, "Invalid username or password")
        
    if not user.get("is_active", True):
        raise HTTPException(403, "User is inactive")
        
    locked_until = user.get("locked_until")
    if locked_until:
        if isinstance(locked_until, str):
            locked_dt = datetime.fromisoformat(locked_until.replace("Z", "+00:00"))
        else:
            locked_dt = locked_until.replace(tzinfo=timezone.utc)
            
        if locked_dt > datetime.now(timezone.utc):
            remaining = int((locked_dt - datetime.now(timezone.utc)).total_seconds() / 60)
            raise HTTPException(429, f"Account locked. Try again in {remaining} minute(s)")
            
    stored_hash = user.get("password_hash")
    if not isinstance(stored_hash, str):
        stored_hash = FAKE_HASH
        
    if not verify_password(body.password, stored_hash):
        attempts = user.get("failed_login_attempts", 0) + 1
        update_data = {"failed_login_attempts": attempts}
        
        if attempts >= LOCKOUT_THRESHOLD:
            update_data["locked_until"] = to_mysql_datetime(datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES))
            update_record("users", user["id"], update_data)
            raise HTTPException(429, f"Account locked due to {LOCKOUT_THRESHOLD} failed attempts. Try again in {LOCKOUT_MINUTES} minute(s)")
            
        update_record("users", user["id"], update_data)
        raise HTTPException(401, "Invalid username or password")
        
    now = to_mysql_datetime(datetime.now(WIB))
    update_record("users", user["id"], {
        "last_login_at": now,
        "failed_login_attempts": 0,
        "locked_until": None,
    })
    
    access_token = create_access_token({"sub": user["id"]})
    raw_refresh, refresh_hash, refresh_expires = generate_refresh_token()
    
    create_record("refresh_tokens", {
        "user_id": user["id"],
        "token_hash": refresh_hash,
        "expires_at": to_mysql_datetime(refresh_expires),
    })
    
    role_name = ""
    role_permissions = {}
    is_superadmin = False
    role_id = user.get("role_id")
    if role_id:
        role = get_by_id("roles", role_id)
        if role:
            role_name = role.get("name", "")
            import json
            perms = role.get("permissions")
            role_permissions = json.loads(perms) if isinstance(perms, str) else (perms or {})
            is_superadmin = bool(role.get("is_superadmin"))
            
    page_perms = execute_raw(
        "SELECT page_id FROM user_page_permissions WHERE user_id = :user_id",
        {"user_id": user["id"]}
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
            "avatar_url": user.get("avatar_url", ""),
            "role_id": role_id,
            "role_name": role_name,
            "permissions": role_permissions,
            "page_permissions": [r["page_id"] for r in page_perms],
            "user_type": user.get("user_type", "admin"),
            "is_superadmin": is_superadmin or user.get("user_type") == "superadmin",
            "is_active": user.get("is_active", True)
        }
    }

@router.post("/refresh", response_model=RefreshResponse)
def refresh(body: RefreshRequest):
    token_hash = hash_refresh_token(body.refresh_token)
    stored = get_by_column("refresh_tokens", "token_hash", token_hash)
    if not stored or stored.get("revoked"):
        raise HTTPException(401, "Invalid refresh token")
        
    expires = stored.get("expires_at")
    if expires:
        if isinstance(expires, str):
            expires_dt = datetime.fromisoformat(expires.replace("Z", "+00:00"))
        else:
            expires_dt = expires.replace(tzinfo=WIB)
        if expires_dt < datetime.now(WIB):
            raise HTTPException(401, "Refresh token expired")
            
    user = get_by_id("users", stored.get("user_id"))
    if not user or not user.get("is_active", True):
        raise HTTPException(401, "User not found or inactive")
        
    update_record("refresh_tokens", stored["id"], {"revoked": True})
    
    new_access = create_access_token({"sub": user["id"]})
    raw_refresh, new_hash, new_expires = generate_refresh_token()
    
    create_record("refresh_tokens", {
        "user_id": user["id"],
        "token_hash": new_hash,
        "expires_at": to_mysql_datetime(new_expires),
    })
    
    return {
        "access_token": new_access,
        "refresh_token": raw_refresh,
        "token_type": "bearer"
    }

@router.get("/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    role_name = ""
    role_permissions = {}
    is_superadmin = False
    role_id = user.get("role_id")
    if role_id:
        role = get_by_id("roles", role_id)
        if role:
            role_name = role.get("name", "")
            import json
            perms = role.get("permissions")
            role_permissions = json.loads(perms) if isinstance(perms, str) else (perms or {})
            is_superadmin = bool(role.get("is_superadmin"))
            
    page_perms = execute_raw(
        "SELECT p.`key` FROM user_page_permissions up JOIN pages p ON up.page_id = p.id WHERE up.user_id = :user_id",
        {"user_id": user["id"]}
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
        "page_permissions": [r["key"] for r in page_perms],
        "user_type": user.get("user_type", "admin"),
        "is_active": user.get("is_active", True),
        "is_superadmin": is_superadmin or user.get("user_type") == "superadmin",
    }

@router.put("/profile")
def update_profile(body: ProfileUpdate, request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    data = {}
    if body.username is not None: data["username"] = body.username
    if body.email is not None: data["email"] = body.email
    if body.full_name is not None: data["full_name"] = body.full_name
    if body.avatar_url is not None: data["avatar_url"] = body.avatar_url
    
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
            
    changes = {}
    for k, v in data.items():
        if k != "password_hash":
            old_val = user.get(k)
            if old_val != v:
                changes[k] = {"old": old_val, "new": v}
                
    ip_address = request.headers.get("x-forwarded-for")
    
    audit_log(
        user_id=user["id"],
        user_username=user.get("username"),
        action="update",
        entity_type="auth_profile",
        entity_id=user["id"],
        changes=changes if changes else None,
        ip_address=ip_address
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
    
    existing_user = get_by_column("users", "username", body.username)
    if existing_user:
        raise HTTPException(400, "Username already exists")
        
    existing_email = get_by_column("users", "email", body.email)
    if existing_email:
        raise HTTPException(400, "Email already exists")
        
    role = get_by_column("roles", "name", "Calon Murid")
    if not role:
        raise HTTPException(500, "Default applicant role not found. Run seed first.")
        
    import uuid
    user_id = str(uuid.uuid4())
    
    user = create_record("users", {
        "id": user_id,
        "username": body.username,
        "email": body.email,
        "full_name": body.full_name,
        "password_hash": hash_password(body.password),
        "role_id": role["id"],
        "user_type": "calon_murid",
        "is_active": True,
    })
    
    access_token = create_access_token({"sub": user["id"]})
    raw_refresh, refresh_hash, refresh_expires = generate_refresh_token()
    
    create_record("refresh_tokens", {
        "user_id": user["id"],
        "token_hash": refresh_hash,
        "expires_at": to_mysql_datetime(refresh_expires),
    })
    
    ip_address = request.headers.get("x-forwarded-for")
    audit_log(
        user_id=user["id"],
        user_username=body.username,
        action="register",
        entity_type="applicant",
        entity_id=user["id"],
        ip_address=ip_address
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
        }
    }

@router.post("/register")
def register_admin(body: RegisterAdminRequest, user: Dict[str, Any] = Depends(get_current_user)):
    validate_password(body.password)
    
    existing = get_by_column("users", "username", body.username)
    if existing:
        raise HTTPException(400, "Username already exists")
        
    new_user = create_record("users", {
        "username": body.username,
        "password_hash": hash_password(body.password),
        "role_id": body.role_id,
        "user_type": body.user_type or "admin",
        "is_active": True,
    })
    
    token = create_access_token({"sub": new_user["id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": new_user["id"], "username": new_user["username"]}
    }

@router.post("/logout")
def logout(user: Dict[str, Any] = Depends(get_current_user)):
    execute_raw("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = :user_id", {"user_id": user["id"]})
    return {"message": "Logged out"}

@router.post("/upload")
def upload(file: UploadFile = File(...), user: Dict[str, Any] = Depends(get_current_user)):
    import shutil
    from pathlib import Path
    import uuid
    import mimetypes
    
    if not file:
        raise HTTPException(400, "No file uploaded")
        
    ext = mimetypes.guess_extension(file.content_type) or ".bin"
    filename = f"{uuid.uuid4()}{ext}"
    
    upload_dir = Path("/mnt/c/ptdarrahman.sch.id/project-ppdb/api/public/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/uploads/{filename}"}
