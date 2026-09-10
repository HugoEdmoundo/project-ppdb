from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Database ---
    # Set DATABASE_URL to override MySQL settings entirely
    # (e.g. sqlite:///./dev.db for local dev)
    database_url: str | None = None

    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "ptdarrahman"
    mysql_ssl: bool = False

    # --- JWT ---
    jwt_secret: str = ""
    jwt_expiry_hours: int = 24

    # --- Cron ---
    cron_secret: str = ""

    # --- Cookies ---
    # Set "true" di produksi (HTTPS) supaya cookie tidak dikirim via HTTP.
    cookie_secure: bool = False

    # --- Payment gateway (Midtrans) ---
    # Server key Midtrans untuk verifikasi signature webhook. Kosongkan jika
    # pembayaran hanya offline/manual.
    midtrans_server_key: str | None = None

    # --- CORS ---
    # "*" = allow all (dev only). Empty = default allowlist + regex (see core/cors.py).
    cors_origins: str = ""
    cors_origin_regex: str = ""

    # --- Frontend URLs (for notification links) ---
    ppdb_frontend_url: str = "http://localhost:5174"
    superadmin_frontend_url: str = "http://localhost:5173"

    # --- Uploads ---
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
    def cloudinary_configured(self) -> bool:
        return bool(
            self.cloudinary_cloud_name
            and self.cloudinary_api_key
            and self.cloudinary_api_secret
        )

    @field_validator("upload_provider")
    @classmethod
    def _validate_upload_provider(cls, value: str) -> str:
        if value not in ("local", "cloudinary", "db"):
            raise ValueError(
                f"UPLOAD_PROVIDER must be 'local', 'cloudinary', or 'db', got '{value}'"
            )
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
