import hashlib
import json
import logging
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from src.core.cache import invalidate_user_cache
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

    def request_account_recovery(self, identifier: str) -> dict[str, str]:
        """Send a short lived WhatsApp OTP without disclosing account existence."""
        from src.core.cache import get_redis
        from src.core.notif_service import send_custom_notifications

        neutral = {
            "message": (
                "Jika akun cocok, kode verifikasi akan dikirim ke WhatsApp terdaftar."
            )
        }
        user = self.repository.get_user_by_username_or_email(identifier.strip())
        if (
            not user
            or user.user_type == "applicant"
            or not user.is_active
            or not user.phone
        ):
            return neutral
        redis = get_redis()
        if redis is None:
            return neutral
        code = f"{secrets.randbelow(1_000_000):06d}"
        key = (
            "account_recovery:"
            + hashlib.sha256(identifier.strip().lower().encode()).hexdigest()
        )
        try:
            redis.setex(
                key, 600, f"{user.id}:{hashlib.sha256(code.encode()).hexdigest()}"
            )
            send_custom_notifications(
                [user.id],
                "whatsapp",
                "Kode pemulihan akun",
                f"Kode verifikasi pemulihan akun Anda: {code}. "
                "Kode berlaku 10 menit. Jangan bagikan kode ini kepada siapa pun.",
                "account_recovery_otp",
            )
        except Exception:
            logger.exception("Could not queue account recovery OTP")
        return neutral

    def verify_account_recovery(self, identifier: str, code: str) -> dict[str, str]:
        from src.core.cache import get_redis
        from src.core.notif_service import send_custom_notifications

        redis = get_redis()
        key = (
            "account_recovery:"
            + hashlib.sha256(identifier.strip().lower().encode()).hexdigest()
        )
        if redis is None:
            raise HTTPException(503, "Layanan pemulihan sementara tidak tersedia")
        try:
            saved = redis.get(key)
            if not saved:
                raise ValueError("expired")
            user_id, code_hash = saved.split(":", 1)
            if not secrets.compare_digest(
                code_hash, hashlib.sha256(code.encode()).hexdigest()
            ):
                raise ValueError("invalid")
            user = self.repository.get_user_by_id(user_id)
            if not user or user.user_type == "applicant" or not user.phone:
                raise ValueError("invalid")
            password = secrets.token_urlsafe(9)
            user.password_hash = hash_password(password)
            user.updated_at = datetime.now(WIB)
            self.repository.db.query(RefreshToken).filter(
                RefreshToken.user_id == user.id
            ).delete(synchronize_session=False)
            self.repository.update_user(user)
            invalidate_user_cache(user.id)
            redis.delete(key)
            send_custom_notifications(
                [user.id],
                "whatsapp",
                "Kredensial akun",
                f"Pemulihan akun berhasil. Username: {user.username}\n"
                f"Password sementara: {password}\n"
                "Segera masuk dan ganti password Anda.",
                "account_recovery_credentials",
            )
            return {
                "message": (
                    "Verifikasi berhasil. Kredensial telah dikirim ke WhatsApp "
                    "terdaftar."
                )
            }
        except ValueError as exc:
            raise HTTPException(400, "Kode verifikasi salah atau kedaluwarsa") from exc

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
            "phone": user.phone or "",
            "full_name": user.full_name or "",
            "avatar_url": user.avatar_url or "",
            "role_id": role_id,
            "role_name": role_name,
            "permissions": role_permissions,
            "page_permissions": page_keys,
            "user_type": user.user_type or "admin",
            "is_superadmin": is_superadmin or user.user_type == "superadmin",
            "is_active": user.is_active,
            "created_at": (
                user.created_at.isoformat() if user.created_at else None
            ),
            "last_login_at": (
                user.last_login_at.isoformat() if user.last_login_at else None
            ),
            "login_denied": False,
            "payment_status": payment_status,
            "payment_deadline": payment_deadline,
        }

    def login(
        self, username: str, password: str, context: dict[str, str] | None = None
    ) -> dict:
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

        ctx = context or {}
        raw_refresh, refresh_hash, refresh_expires = generate_refresh_token()

        rt = RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_expires,
            revoked=False,
            created_at=datetime.now(WIB),
            user_agent=ctx.get("user_agent") or None,
            ip_address=ctx.get("ip_address") or None,
            app=ctx.get("app") or None,
            last_seen_at=datetime.now(WIB),
        )
        self.repository.create_refresh_token(rt)
        self.cleanup_expired_sessions(user.id)

        access_token = create_access_token({"sub": user.id, "sid": rt.id})

        return {
            "access_token": access_token,
            "refresh_token": raw_refresh,
            "token_type": "bearer",
            "user": self._serialize_user(user),
        }

    def refresh(
        self, refresh_token_str: str, context: dict[str, str] | None = None
    ) -> dict:
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

        now = datetime.now(WIB)
        ctx = context or {}
        raw_refresh, new_hash, refresh_expires = generate_refresh_token()

        # Rotasi token: metadata perangkat & waktu mulai sesi ikut dipindahkan
        # supaya sesi tidak hilang dari daftar "Sesi Perangkat" saat token
        # berganti. `last_seen_at` diperbarui setiap kali token di-refresh.
        rt = RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=new_hash,
            expires_at=refresh_expires,
            revoked=False,
            created_at=stored.created_at or now,
            user_agent=ctx.get("user_agent") or stored.user_agent,
            ip_address=ctx.get("ip_address") or stored.ip_address,
            app=ctx.get("app") or stored.app,
            last_seen_at=now,
        )
        self.repository.create_refresh_token(rt)

        # Rotasi token: hapus token lama agar tidak menumpuk di database
        try:
            self.repository.db.delete(stored)
            self.repository.db.commit()
        except Exception:
            self.repository.db.rollback()
        self.cleanup_expired_sessions(user.id)

        access_token = create_access_token({"sub": user.id, "sid": rt.id})

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
            user_id = stored.user_id
            try:
                self.repository.db.delete(stored)
                self.repository.db.commit()
            except Exception:
                self.repository.db.rollback()
            if user_id:
                self.cleanup_expired_sessions(user_id)

    def get_me(self, user_dict: dict) -> dict:
        user = self.repository.get_user_by_id(user_dict["id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        # Tandai sesi perangkat ini masih aktif (throttled 60 detik).
        self.touch_session(user_dict.get("session_id"))
        return self._serialize_user(user)

    def touch_session(self, session_id: str | None) -> None:
        """Perbarui `last_seen_at` sesi (dipanggil dari GET /me)."""
        if not session_id:
            return
        try:
            rt = (
                self.repository.db.query(RefreshToken)
                .filter(RefreshToken.id == session_id)
                .first()
            )
            if not rt:
                return
            now = datetime.now(WIB)
            previous = self._coerce_dt(rt.last_seen_at)
            if previous and (now - previous).total_seconds() < 60:
                return
            rt.last_seen_at = now
            self.repository.db.commit()
        except Exception:  # noqa: BLE001 - metadata sesi tidak boleh menggagalkan /me
            self.repository.db.rollback()
            logger.debug("Could not update session last_seen_at", exc_info=True)

    def cleanup_expired_sessions(self, user_id: str | None = None) -> int:
        """Hapus sesi yang sudah kedaluwarsa atau dicabut dari database agar tidak menumpuk."""
        try:
            now = datetime.now(WIB)
            q = self.repository.db.query(RefreshToken).filter(
                (RefreshToken.revoked.is_(True)) | (RefreshToken.expires_at <= now)
            )
            if user_id:
                q = q.filter(RefreshToken.user_id == user_id)
            deleted = q.delete(synchronize_session=False)
            self.repository.db.commit()
            return deleted
        except Exception:
            self.repository.db.rollback()
            return 0

    def list_sessions(self, user_dict: dict) -> dict:
        """Daftar sesi perangkat yang masih aktif (belum logout/kedaluwarsa)."""
        from src.core.session_meta import serialize_session

        user_id = user_dict["id"]
        current_session_id = user_dict.get("session_id")
        now = datetime.now(WIB)

        # Bersihkan sesi kedaluwarsa atau yang sudah dicabut agar tidak menumpuk di database
        self.cleanup_expired_sessions(user_id)

        rows = (
            self.repository.db.query(RefreshToken)
            .filter(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked.is_(False),
                RefreshToken.expires_at > now,
            )
            .all()
        )

        def _sort_key(row: RefreshToken) -> datetime:
            return (
                self._coerce_dt(row.last_seen_at)
                or self._coerce_dt(row.created_at)
                or now
            )

        rows.sort(key=_sort_key, reverse=True)
        sessions = [
            serialize_session(
                row,
                user_type=user_dict.get("user_type"),
                current_session_id=current_session_id,
            )
            for row in rows
        ]
        # Sesi yang sedang dipakai selalu paling atas (sisanya urut terbaru).
        sessions.sort(key=lambda item: not item["is_current"])
        return {"sessions": sessions, "current_session_id": current_session_id}

    def revoke_session(self, user_dict: dict, session_id: str) -> dict:
        """Akhiri satu sesi perangkat lain. Sesi aktif saat ini tidak boleh."""
        user_id = user_dict["id"]
        if session_id and session_id == user_dict.get("session_id"):
            raise HTTPException(
                status_code=400,
                detail="Sesi yang sedang Anda gunakan tidak dapat diakhiri.",
            )
        self.revoke_session_by_id(user_id, session_id)
        return {"message": "Sesi berhasil diakhiri"}

    def revoke_session_by_id(self, user_id: str, session_id: str | None) -> None:
        """Cabut dan hapus satu sesi dari database agar tidak menumpuk."""
        if not session_id:
            return
        try:
            (
                self.repository.db.query(RefreshToken)
                .filter(
                    RefreshToken.id == session_id, RefreshToken.user_id == user_id
                )
                .delete(synchronize_session=False)
            )
            self.repository.db.commit()
        except Exception:
            self.repository.db.rollback()
        self.cleanup_expired_sessions(user_id)

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

        if "phone" in data:
            user.phone = data["phone"]

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

    def register_applicant(
        self, data: dict, context: dict[str, str] | None = None
    ) -> dict:
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

        now = datetime.now(WIB)
        ctx = context or {}
        raw_refresh, refresh_hash, refresh_expires = generate_refresh_token()
        rt = RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_expires,
            revoked=False,
            created_at=now,
            user_agent=ctx.get("user_agent") or None,
            ip_address=ctx.get("ip_address") or None,
            app=ctx.get("app") or None,
            last_seen_at=now,
        )
        self.repository.create_refresh_token(rt)

        access_token = create_access_token({"sub": user.id, "sid": rt.id})

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
        import string
        from datetime import date as date_type

        from src.core.notif_service import send_custom_notifications
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
        phone = applicant.phone or user.phone
        if not phone:
            raise HTTPException(
                400,
                "Akun belum memiliki nomor WhatsApp terdaftar. Hubungi admin.",
            )

        # Generate new password
        chars = string.ascii_letters + string.digits
        new_password = "".join(secrets.choice(chars) for _ in range(12))

        user.password_hash = hash_password(new_password)
        user.updated_at = datetime.now(WIB)
        self.repository.db.query(RefreshToken).filter(
            RefreshToken.user_id == user.id
        ).delete(synchronize_session=False)
        self.repository.db.commit()

        try:
            send_custom_notifications(
                [user.id],
                "whatsapp",
                "Kredensial akun PPDB",
                f"Pemulihan akun PPDB berhasil. Username: {user.username}\n"
                f"Password sementara: {new_password}\n"
                "Segera masuk dan ganti password Anda.",
                "account_recovery_credentials",
            )
        except Exception:
            logger.exception("Could not queue applicant recovery credentials")

        return {
            "message": (
                "Jika data cocok, kredensial akan dikirim ke WhatsApp terdaftar."
            )
        }
