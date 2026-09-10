import hashlib
from datetime import UTC, datetime, timedelta
from typing import Any, cast
from uuid import uuid4
from zoneinfo import ZoneInfo

import bcrypt
import jwt

from src.core.config import settings

WIB = ZoneInfo("Asia/Jakarta")
BCRYPT_ROUNDS = 12


def hash_password(password: str) -> str:
    """Hash a password with bcrypt (cost 12, matches bcryptjs legacy)."""
    if password is None:
        raise ValueError("password cannot be None")
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    return cast(str, bcrypt.hashpw(password_bytes, salt).decode("utf-8"))


def validate_password(password: str) -> None:
    """Validate password strength. Raises HTTPException 400 if invalid."""
    from fastapi import HTTPException

    if not password or len(password) < 8:
        raise HTTPException(400, "Password harus minimal 8 karakter")
    if not any(c.isupper() for c in password):
        raise HTTPException(400, "Password harus mengandung minimal 1 huruf besar")
    if not any(c.islower() for c in password):
        raise HTTPException(400, "Password harus mengandung minimal 1 huruf kecil")
    if not any(c.isdigit() for c in password):
        raise HTTPException(400, "Password harus mengandung minimal 1 angka")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    try:
        stored = (
            hashed_password.encode("utf-8")
            if isinstance(hashed_password, str)
            else hashed_password
        )
        if not stored.startswith(b"$2"):
            return False
        return cast(bool, bcrypt.checkpw(plain_password.encode("utf-8")[:72], stored))
    except (ValueError, TypeError):
        return False


def create_access_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    now = datetime.now(UTC)
    expire = now + timedelta(hours=settings.jwt_expiry_hours)
    to_encode.update({"exp": expire, "iat": now, "jti": str(uuid4())})
    return cast(str, jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256"))


def verify_token(token: str) -> dict[str, Any] | None:
    try:
        return cast(
            dict[str, Any] | None,
            jwt.decode(token, settings.jwt_secret, algorithms=["HS256"]),
        )
    except jwt.PyJWTError:
        return None


def hash_sha256(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def hash_refresh_token(raw: str) -> str:
    return hash_sha256(raw)


def generate_refresh_token() -> tuple[str, str, datetime]:
    raw = str(uuid4()) + str(uuid4())
    hashed = hash_refresh_token(raw)
    expires_at = datetime.now(WIB) + timedelta(days=settings.jwt_refresh_expiry_days)
    return raw, hashed, expires_at
