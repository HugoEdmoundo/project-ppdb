import json
import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from src.core.cache import invalidate_user_cache
from src.core.notif_service import send_notifications
from src.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from src.models.auth import RefreshToken, Role, User
from src.repositories.auth_repository import AuthRepository

logger = logging.getLogger("ptdarrahman.auth")

LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15
FAKE_HASH = "$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1QlFZqFOBmH39JcGpGtI7qJkGzS"
WIB = ZoneInfo("Asia/Jakarta")


class AuthService:
    def __init__(self, repository: AuthRepository):
        self.repository = repository

    def _coerce_dt(self, value):
        if not value:
            return None
        try:
            if isinstance(value, str):
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            if isinstance(value, datetime):
                return value.replace(tzinfo=UTC) if value.tzinfo is None else value
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
                if raw:
                    if isinstance(raw, str):
                        try:
                            parsed = json.loads(raw)
                            if isinstance(parsed, dict):
                                role_permissions = parsed
                        except json.JSONDecodeError:
                            pass
                    elif isinstance(raw, dict):
                        role_permissions = raw
                is_superadmin = bool(role.is_superadmin)

        page_keys = self.repository.get_page_permissions(user.id)

        payment_status = None
        payment_deadline = None
        if user.user_type == "applicant":
            applicant = self.repository.get_applicant_by_user_id(user.id)
            if applicant:
                payment_status = applicant.payment_status
                deadline = applicant.payment_deadline
                if deadline:
                    payment_deadline = (
                        deadline
                        if isinstance(deadline, str)
                        else deadline.strftime("%Y-%m-%d %H:%M:%S")
                    )

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
            "login_denied": False,
            "payment_status": payment_status,
            "payment_deadline": payment_deadline,
        }

    def login(self, username: str, password: str) -> dict:
        user = self.repository.get_user_by_username_or_email(username)
        if not user:
            raise HTTPException(401, "Username atau email tidak ditemukan")

        if not user.is_active:
            raise HTTPException(403, "User is inactive")

        locked_until = user.locked_until
        if locked_until:
            locked_dt = self._coerce_dt(locked_until)
            if locked_dt and locked_dt > datetime.now(WIB):
                remaining = max(
                    1, int((locked_dt - datetime.now(WIB)).total_seconds() / 60)
                )
                raise HTTPException(
                    429, f"Account locked. Try again in {remaining} minute(s)"
                )

        stored_hash = user.password_hash
        if not isinstance(stored_hash, str) or not stored_hash.startswith("$2"):
            stored_hash = FAKE_HASH

        if not verify_password(password, stored_hash):
            attempts = (user.failed_login_attempts or 0) + 1
            if attempts >= LOCKOUT_THRESHOLD:
                user.failed_login_attempts = attempts
                user.locked_until = datetime.now(UTC) + timedelta(
                    minutes=LOCKOUT_MINUTES
                )
                self.repository.update_user(user)
                raise HTTPException(
                    429,
                    f"Account locked due to {LOCKOUT_THRESHOLD} failed attempts. "
                    f"Try again in {LOCKOUT_MINUTES} minute(s)",
                )

            user.failed_login_attempts = attempts
            self.repository.update_user(user)
            raise HTTPException(401, "Password salah")

        # Validasi module access: user_type=admin/applicant dengan role yang
        # seluruh module-nya = "none" tidak boleh login sama sekali.
        # Superadmin (user_type="superadmin" atau role.is_superadmin=True)
        # SELALU bypass pengecekan ini.
        if user.user_type not in ("superadmin",):
            role = (
                self.repository.get_role_by_id(user.role_id) if user.role_id else None
            )
            is_super_role = bool(role and role.is_superadmin) if role else False
            if not is_super_role:
                if user.user_type == "applicant":
                    # Applicant: role Pendaftar bawaan — selalu diizinkan masuk
                    pass
                else:
                    # Admin biasa: cek apakah semua module di permissions = "none"
                    permissions: dict = {}
                    if role:
                        raw = role.permissions
                        if isinstance(raw, str):
                            try:
                                parsed = json.loads(raw)
                                if isinstance(parsed, dict):
                                    permissions = parsed
                            except json.JSONDecodeError:
                                pass
                        elif isinstance(raw, dict):
                            permissions = raw
                    # Jika role tidak punya permissions sama sekali ATAU
                    # semua nilai = "none", blokir login
                    all_none = not permissions or all(
                        v == "none" for v in permissions.values()
                    )
                    if all_none:
                        raise HTTPException(
                            403,
                            "module_disabled: Akses ditolak — semua modul "
                            "dinonaktifkan oleh superadmin. "
                            "Hubungi superadmin untuk mengaktifkan akses.",
                        )

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
            created_at=datetime.now(WIB),
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
            created_at=datetime.now(WIB),
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
        from src.core.security import verify_password

        user = self.repository.get_user_by_id(user_dict["id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        username = data.get("username")
        if username is not None and username != user.username:
            existing = self.repository.get_user_by_username_or_email(username)
            if existing and existing.id != user.id:
                raise HTTPException(status_code=400, detail="Username already in use")
            user.username = username

        email = data.get("email")
        if email is not None and email != (user.email or ""):
            is_super = user_dict.get("user_type") == "superadmin" or bool(
                user_dict.get("is_superadmin")
            )
            if not is_super:
                raise HTTPException(
                    status_code=403, detail="Only superadmin can change email"
                )
            existing = self.repository.get_user_by_username_or_email(email)
            if existing and existing.id != user.id:
                raise HTTPException(status_code=400, detail="Email already in use")
            user.email = email

        if data.get("full_name") is not None:
            user.full_name = data["full_name"]

        if data.get("avatar_url") is not None:
            user.avatar_url = data["avatar_url"]

        new_password = data.get("new_password") or data.get("password")
        if new_password:
            if not data.get("old_password"):
                raise HTTPException(status_code=400, detail="Old password is required")
            if not verify_password(data["old_password"], user.password_hash):
                raise HTTPException(status_code=400, detail="Old password is incorrect")
            user.password_hash = hash_password(new_password)

        self.repository.update_user(user)
        # Invalidate Redis cache after profile update
        invalidate_user_cache(user.id)
        return self._serialize_user(user)

    def register_applicant(self, data: dict) -> dict:
        if self.repository.get_user_by_username_or_email(data["username"]):
            raise HTTPException(400, "Username already exists")
        if self.repository.get_user_by_username_or_email(data["email"]):
            raise HTTPException(400, "Email already exists")

        role = self.repository.db.query(Role).filter(Role.name == "Pendaftar").first()
        if not role:
            raise HTTPException(
                500, "Default applicant role not found. Run seed first."
            )

        user = User(
            id=str(uuid.uuid4()),
            username=data["username"],
            email=data["email"],
            full_name=data["full_name"],
            password_hash=hash_password(data["password"]),
            role_id=role.id,
            user_type="applicant",
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
            created_at=datetime.now(WIB),
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
                "user_type": "applicant",
            },
        }

    def register_admin(self, data: dict) -> dict:
        if self.repository.get_user_by_username_or_email(data["username"]):
            raise HTTPException(400, "Username already exists")

        email = data.get("email") or ""
        if email and self.repository.get_user_by_username_or_email(email):
            raise HTTPException(400, "Email already exists")

        user = User(
            id=str(uuid.uuid4()),
            username=data["username"],
            email=email,
            password_hash=hash_password(data["password"]),
            role_id=data.get("role_id"),
            user_type=data.get("user_type", "admin"),
            is_active=True,
            created_at=datetime.now(WIB),
            updated_at=datetime.now(WIB),
        )
        try:
            self.repository.db.add(user)
            self.repository.db.commit()
        except IntegrityError as exc:
            self.repository.db.rollback()
            raise HTTPException(400, "Username atau email sudah digunakan") from exc
        self.repository.db.refresh(user)

        token = create_access_token({"sub": user.id})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": self._serialize_user(user),
        }

    def recover_applicant(self, nik: str, birth_date: str) -> dict:
        import random
        import string
        from datetime import date as date_type

        from src.core.config import settings
        from src.models.ppdb import PPDBApplicant

        try:
            birth_day = date_type.fromisoformat((birth_date or "").strip())
        except ValueError as exc:
            raise HTTPException(
                400, "Format tanggal lahir tidak valid (YYYY-MM-DD)"
            ) from exc

        applicant = (
            self.repository.db.query(PPDBApplicant)
            .filter(
                PPDBApplicant.nik == (nik or "").strip(),
                PPDBApplicant.birth_date == birth_day,
            )
            .first()
        )

        if not applicant:
            raise HTTPException(404, "Data pendaftar tidak ditemukan")

        user = self.repository.get_user_by_id(applicant.user_id)
        if not user:
            raise HTTPException(404, "Akun pengguna tidak ditemukan")

        # Generate new password
        chars = string.ascii_letters + string.digits
        new_password = "".join(random.choice(chars) for _ in range(8))

        user.password_hash = hash_password(new_password)
        user.updated_at = datetime.now(WIB)
        self.repository.db.commit()

        # Password baru dikirim lewat channel notifikasi (email/WA), bukan
        # dikembalikan lewat response API. Ini mencegah siapa pun yang hanya
        # mengetahui NIK + tanggal lahir mengambil alih akun.
        try:
            send_notifications(
                [
                    (
                        "password_reset",
                        {
                            "password": new_password,
                            "link_login": f"{settings.ppdb_frontend_url}/auth/login",
                        },
                    )
                ],
                user.id,
                user_row={
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "full_name": user.full_name,
                    "phone": user.phone or "",
                },
                applicant_row={
                    "id": applicant.id,
                    "full_name": applicant.full_name,
                    "phone": applicant.phone,
                },
            )
        except Exception:
            logger.exception("send password_reset notification failed; continuing")

        return {
            "message": (
                "Reset password berhasil. Password baru telah dikirim ke "
                "email/WhatsApp yang terdaftar."
            )
        }
