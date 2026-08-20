from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Database ---
    # Set DATABASE_URL to override MySQL settings entirely (e.g. sqlite:///./dev.db for local dev)
    database_url: Optional[str] = None

    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "ptdarrahman"
    mysql_ssl: bool = False

    # --- JWT ---
    jwt_secret: str = "dev-only-secret-change-me"
    jwt_expiry_hours: int = 24

    # --- CORS ---
    # "*" = allow all (dev only). Empty = default allowlist + regex (see core/cors.py).
    cors_origins: str = ""
    cors_origin_regex: str = ""

    # --- Frontend URLs (for notification links) ---
    ppdb_frontend_url: str = "http://localhost:5173"

    # --- Uploads ---
    upload_provider: str = "local"  # local
    upload_dir: str = "uploads"

    cloudinary_cloud_name: Optional[str] = None
    cloudinary_api_key: Optional[str] = None
    cloudinary_api_secret: Optional[str] = None
    cloudinary_folder: str = "ptdarrahman"
    cloudinary_secure: bool = True

    # --- Seeding ---
    seed_superadmin_username: Optional[str] = None
    seed_superadmin_password: Optional[str] = None
    seed_superadmin_email: Optional[str] = None

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


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
