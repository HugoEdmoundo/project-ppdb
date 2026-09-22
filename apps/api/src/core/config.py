from functools import lru_cache
from typing import cast

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    # ── Database (MySQL only) ────────────────────────────────────────────────
    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "ptdarrahman"
    mysql_ssl: bool = False

    # ── Redis ────────────────────────────────────────────────────────────────
    # Dipakai oleh rate limiter dan user-session cache.
    # Format: redis://:password@host:port/db   ATAU  host:port (tanpa auth)
    redis_url: str = "redis://localhost:6379/0"

    # TTL cache user-session di Redis (detik). Default 5 menit.
    user_cache_ttl: int = 300

    # ── JWT ──────────────────────────────────────────────────────────────────
    jwt_secret: str = ""
    jwt_expiry_hours: int = 24

    # ── Cron ─────────────────────────────────────────────────────────────────
    cron_secret: str = ""

    # ── Cookies ──────────────────────────────────────────────────────────────
    # Wajib true di produksi (HTTPS). Reverse-proxy otomatis override ini
    # via x-forwarded-proto=https tanpa perlu set manual (lihat auth/router.py).
    cookie_secure: bool = False

    # ── Payment gateway (Midtrans) ───────────────────────────────────────────
    midtrans_server_key: str | None = None

    # ── CORS ─────────────────────────────────────────────────────────────────
    # "*" = allow all (dev only; credentials nonaktif).
    # Kosong (default) = allowlist bawaan + regex localhost.
    cors_origins: str = ""
    cors_origin_regex: str = ""

    # ── Frontend URLs (for notification deep-links) ──────────────────────────
    ppdb_frontend_url: str = "http://localhost:5174"
    superadmin_frontend_url: str = "http://localhost:5173"

    # --- WhatsApp Microservice ---
    # Base URL publik dari API ini (dipakai panel WhatsApp untuk memvalidasi
    # WEBHOOK_URL microservice). Sesuaikan dengan domain/port FastAPI.
    api_base_url: str = "http://localhost:8000"
    # URL ke apps/whatsapp/ Express service
    wa_service_url: str = "http://localhost:3100"
    wa_service_api_key: str = ""
    wa_webhook_secret: str = ""

    # ── Uploads ──────────────────────────────────────────────────────────────
    upload_provider: str = "local"  # local | cloudinary | db
    upload_dir: str = "uploads"

    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None
    cloudinary_folder: str = "ptdarrahman"
    cloudinary_secure: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def jwt_refresh_expiry_days(self) -> int:
        return 7

    @property
    def database_url(self) -> str:
        """MySQL connection URL (single source of truth for alembic/seed)."""
        return cast(
            str,
            URL.create(
                drivername="mysql+pymysql",
                username=self.mysql_user,
                password=self.mysql_password,
                host=self.mysql_host,
                port=self.mysql_port,
                database=self.mysql_database,
            ).render_as_string(hide_password=False),
        )

    @property
    def cloudinary_configured(self) -> bool:
        return bool(
            self.cloudinary_cloud_name
            and self.cloudinary_api_key
            and self.cloudinary_api_secret
        )

    @field_validator("upload_provider")
    @classmethod
    def _validate_upload_provider(cls, value: str) -> str:
        allowed = {"local", "cloudinary", "db"}
        if value not in allowed:
            raise ValueError(f"UPLOAD_PROVIDER must be one of {allowed}, got '{value}'")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
