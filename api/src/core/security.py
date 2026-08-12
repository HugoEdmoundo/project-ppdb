import hashlib
import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from uuid import uuid4
from zoneinfo import ZoneInfo
from src.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
WIB = ZoneInfo("Asia/Jakarta")

def hash_password(password: str) -> str:
    # Match bcryptjs cost factor 12
    return pwd_context.hash(password, rounds=12)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    now = datetime.now(ZoneInfo("UTC"))
    expire = now + timedelta(hours=settings.jwt_expiry_hours)
    
    to_encode.update({
        "exp": expire,
        "iat": now,
        "jti": str(uuid4())
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
    return encoded_jwt

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        return None

def hash_sha256(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def hash_refresh_token(raw: str) -> str:
    return hash_sha256(raw)

def generate_refresh_token() -> Tuple[str, str, datetime]:
    raw = str(uuid4()) + str(uuid4())
    hashed = hash_refresh_token(raw)
    expires_at = datetime.now(WIB) + timedelta(days=7)
    return raw, hashed, expires_at
