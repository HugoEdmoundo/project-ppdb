import json
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Any, Dict

from fastapi import HTTPException

from src.models.auth import RefreshToken
from src.repositories.auth_repository import AuthRepository
from src.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)

LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15
FAKE_HASH = "$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1QlFZqFOBmH39JcGpGtI7qJkGzS"
WIB = ZoneInfo("Asia/Jakarta")

class AuthService:
    def __init__(self, repository: AuthRepository):
        self.repository = repository

    def _coerce_dt(self, value):
        if not value: return None
        try:
            if isinstance(value, str):
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            if isinstance(value, datetime):
                return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
        except ValueError:
            return None
        return None

    def _serialize_user(self, user) -> dict:
        role_id = user.role_id
        role_name = ""
        role_permissions: dict[str, Any] = {}
        is_superadmin = False

        if role_id:
            role = self.repository.get_role_by_id(role_id)
            if role:
                role_name = role.name
                raw = role.permissions
                role_permissions = json.loads(raw) if isinstance(raw, str) and raw else (raw or {})
                is_superadmin = bool(role.is_superadmin)

        page_keys = self.repository.get_page_permissions(user.id)
        
        payment_status = None
        payment_deadline = None
        if user.user_type in ["calon_murid", "applicant"]:
            applicant = self.repository.get_applicant_by_user_id(user.id)
            if applicant:
                payment_status = applicant.payment_status
                deadline = applicant.payment_deadline
                if deadline:
                    payment_deadline = deadline if isinstance(deadline, str) else deadline.strftime("%Y-%m-%d %H:%M:%S")

        return {
            "id": user.id,
            "username": user.username,
            "email": user.email or "",
            "full_name": user.full_name or "",
            "avatar_url": user.avatar_url or "",
            "role_id": role_id,
            "role_name": role_name,
            "permissions": role_permissions,
            "page_permissions": page_keys,
            "user_type": user.user_type or "admin",
            "is_superadmin": is_superadmin or user.user_type == "superadmin",
            "is_active": user.is_active,
            "payment_status": payment_status,
            "payment_deadline": payment_deadline,
        }

    def login(self, username: str, password: str) -> dict:
        user = self.repository.get_user_by_username_or_email(username)
        if not user:
            raise HTTPException(401, "Invalid username or password")

        if not user.is_active:
            raise HTTPException(403, "User is inactive")

        locked_until = user.locked_until
        if locked_until:
            locked_dt = self._coerce_dt(locked_until)
            if locked_dt and locked_dt > datetime.now(WIB):
                remaining = max(1, int((locked_dt - datetime.now(WIB)).total_seconds() / 60))
                raise HTTPException(429, f"Account locked. Try again in {remaining} minute(s)")

        stored_hash = user.password_hash
        if not isinstance(stored_hash, str) or not stored_hash.startswith("$2"):
            stored_hash = FAKE_HASH

        if not verify_password(password, stored_hash):
            attempts = (user.failed_login_attempts or 0) + 1
            if attempts >= LOCKOUT_THRESHOLD:
                user.failed_login_attempts = attempts
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
                self.repository.update_user(user)
                raise HTTPException(429, f"Account locked due to {LOCKOUT_THRESHOLD} failed attempts. Try again in {LOCKOUT_MINUTES} minute(s)")
            
            user.failed_login_attempts = attempts
            self.repository.update_user(user)
            raise HTTPException(401, "Invalid username or password")

        user.last_login_at = datetime.now(WIB)
        user.failed_login_attempts = 0
        user.locked_until = None
        self.repository.update_user(user)

        access_token = create_access_token({"sub": user.id})
        raw_refresh, refresh_hash, refresh_expires = generate_refresh_token()
        
        rt = RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_expires,
            revoked=False,
            created_at=datetime.now(WIB)
        )
        self.repository.create_refresh_token(rt)

        return {
            "access_token": access_token,
            "refresh_token": raw_refresh,
            "token_type": "bearer",
            "user": self._serialize_user(user),
        }

    def refresh(self, refresh_token_str: str) -> dict:
        token_hash = hash_refresh_token(refresh_token_str)
        stored = self.repository.get_refresh_token(token_hash)
        if not stored or stored.revoked:
            raise HTTPException(401, "Invalid refresh token")

        expires = stored.expires_at
        if expires:
            expires_dt = self._coerce_dt(expires)
            if expires_dt and expires_dt < datetime.now(WIB):
                raise HTTPException(401, "Refresh token expired")

        user = self.repository.get_user_by_id(stored.user_id)
        if not user or not user.is_active:
            raise HTTPException(401, "User not found or inactive")

        access_token = create_access_token({"sub": user.id})
        raw_refresh, new_hash, refresh_expires = generate_refresh_token()
        
        rt = RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=new_hash,
            expires_at=refresh_expires,
            revoked=False,
            created_at=datetime.now(WIB)
        )
        self.repository.create_refresh_token(rt)
        
        stored.revoked = True
        self.repository.update_refresh_token(stored)

        return {
            "access_token": access_token,
            "refresh_token": raw_refresh,
            "token_type": "bearer",
            "user": self._serialize_user(user),
        }

    def logout(self, refresh_token_str: str) -> None:
        if not refresh_token_str:
            return
        token_hash = hash_refresh_token(refresh_token_str)
        stored = self.repository.get_refresh_token(token_hash)
        if stored:
            stored.revoked = True
            self.repository.update_refresh_token(stored)

    def get_me(self, user_dict: dict) -> dict:
        user = self.repository.get_user_by_id(user_dict["id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return self._serialize_user(user)

    def update_profile(self, user_dict: dict, data: dict) -> dict:
        user = self.repository.get_user_by_id(user_dict["id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if data.get("full_name") is not None:
            user.full_name = data["full_name"]
            
        if data.get("password"):
            user.password_hash = hash_password(data["password"])

        self.repository.update_user(user)
        return self._serialize_user(user)

    def register_applicant(self, data: dict) -> dict:
        if self.repository.get_user_by_username_or_email(data["username"]):
            raise HTTPException(400, "Username already exists")
        if self.repository.get_user_by_username_or_email(data["email"]):
            raise HTTPException(400, "Email already exists")

        role = self.repository.db.query(Role).filter(Role.name == "Calon Murid").first()
        if not role:
            raise HTTPException(500, "Default applicant role not found. Run seed first.")

        user = User(
            id=str(uuid.uuid4()),
            username=data["username"],
            email=data["email"],
            full_name=data["full_name"],
            password_hash=hash_password(data["password"]),
            role_id=role.id,
            user_type="calon_murid",
            is_active=True,
            created_at=datetime.now(WIB),
            updated_at=datetime.now(WIB),
        )
        # I'll just use self.repository.db directly for simplicity here
        self.repository.db.add(user)
        self.repository.db.commit()
        self.repository.db.refresh(user)

        access_token = create_access_token({"sub": user.id})
        raw_refresh, refresh_hash, refresh_expires = generate_refresh_token()
        rt = RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_expires,
            revoked=False,
            created_at=datetime.now(WIB)
        )
        self.repository.create_refresh_token(rt)

        return {
            "access_token": access_token,
            "refresh_token": raw_refresh,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email or "",
                "full_name": user.full_name or "",
                "role_id": role.id,
                "role_name": role.name,
                "user_type": "calon_murid",
            },
        }

    def register_admin(self, data: dict) -> dict:
        if self.repository.get_user_by_username_or_email(data["username"]):
            raise HTTPException(400, "Username already exists")

        user = User(
            id=str(uuid.uuid4()),
            username=data["username"],
            password_hash=hash_password(data["password"]),
            role_id=data.get("role_id"),
            user_type=data.get("user_type", "admin"),
            is_active=True,
            created_at=datetime.now(WIB),
            updated_at=datetime.now(WIB),
        )
        self.repository.db.add(user)
        self.repository.db.commit()
        self.repository.db.refresh(user)

        token = create_access_token({"sub": user.id})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": self._serialize_user(user),
        }

    def recover_applicant(self, nik: str, birth_date: str) -> dict:
        from src.models.ppdb import PPDBApplicant
        import random
        import string
        
        applicant = self.repository.db.query(PPDBApplicant).filter(
            PPDBApplicant.nik == nik,
            PPDBApplicant.birth_date == birth_date
        ).first()
        
        if not applicant:
            raise HTTPException(404, "Data pendaftar tidak ditemukan")
            
        user = self.repository.get_user_by_id(applicant.user_id)
        if not user:
            raise HTTPException(404, "Akun pengguna tidak ditemukan")
            
        # Generate new password
        chars = string.ascii_letters + string.digits
        new_password = ''.join(random.choice(chars) for _ in range(8))
        
        user.password_hash = hash_password(new_password)
        user.updated_at = datetime.now(WIB)
        self.repository.db.commit()
        
        return {
            "username": user.username,
            "new_password": new_password
        }
