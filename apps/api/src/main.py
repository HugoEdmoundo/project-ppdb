import logging
import threading
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from scalar_fastapi import get_scalar_api_reference

from src.core.config import settings
from src.core.cors import setup_cors
from src.core.database import execute_raw
from src.core.middleware import ServerErrorJSONMiddleware
from src.modules.auth.router import router as auth_router
from src.modules.companyprofile.router import router as companyprofile_router
from src.modules.modules.router import router as modules_router
from src.modules.notifications.router import router as notifications_router
from src.modules.payment.router import router as payment_router
from src.modules.ppdb.router import router as ppdb_router
from src.modules.roles.router import router as roles_router
from src.modules.search.router import router as search_router
from src.modules.selection.router import router as selection_router
from src.modules.superadmin.router import router as superadmin_router
from src.modules.uploads.router import router as uploads_router
from src.modules.users.router import router as users_router
from src.modules.whatsapp.router import router as whatsapp_router

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s"
)
logger = logging.getLogger("ptdarrahman")

# Filter untuk menyembunyikan log uvicorn access yang mengejek /v1/models
# (terutama untuk IDE/tooling auto-discovery yang menghasilkan 404 Not Found).
import logging

class IdeErrorFilter(logging.Filter):
    """Filter untuk menyaring log access uvicorn yang mengandung path /v1/models."""
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        # Filter log yang berisi "GET ... /v1/models" dan "404 Not Found"
        if "/v1/models" in msg and "404" in msg:
            return False  # jangan tampilkan log ini
        return True  # tampilkan log lainnya


# Terapkan filter ke logger uvicorn access
for handler in logging.root.handlers:
    name = getattr(handler, "name", None)
    if name and "uvicorn" in name:
        handler.addFilter(IdeErrorFilter())

# Also filter the specific "ptdarrahman" logger
logger.addFilter(IdeErrorFilter())

FAVICON_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
    '<rect width="16" height="16" rx="4" fill="#0f172a"/>'
    '<text x="8" y="12" font-size="11" font-family="sans-serif" font-weight="bold" '
    'text-anchor="middle" fill="#34d399">A</text></svg>'
)


def keep_db_alive():
    """Jaga agar pool tidak hanya berisi koneksi mati.

    WAJIB hanya SATU query per 30 detik pada koneksi pooled. Versi lama
    membuka 5 koneksi tiap 15 detik (~20 koneksi/menit, 28.800/hari) — cukup
    untuk memicu rate-limit MySQL hostinger; begitu koneksi baru mulai
    ditolak, `pool_pre_ping` tiap request ikut membuat koneksi baru sehingga
    terjadi death spiral.
    """
    while True:
        time.sleep(30)
        try:
            execute_raw("SELECT 1")
        except Exception as exc:  # noqa: BLE001 - background thread, jangan fatal
            logger.debug("Keep-alive DB gagal (dicoba lagi 30s): %s", exc)


def _wait_for_database(max_wait: int = 90) -> bool:
    """Tunggu MySQL siap sebelum API menerima request.

    MySQL remote (hostinger) sesekali menolak koneksi sesaat. Tanpa retry, satu
    kegagalan fatal saat startup membuat container crash-loop, dan karena
    `depends_on: service_healthy`, container frontend + whatsapp ikut gagal
    start — satu kedipan DB menjatuhkan seluruh stack.
    """
    deadline = time.monotonic() + max_wait
    delay = 2.0
    while True:
        try:
            execute_raw("SELECT 1")
            return True
        except Exception as exc:  # noqa: BLE001
            if time.monotonic() >= deadline:
                logger.error(
                    "Database tidak tersedia setelah %ss: %s — API tetap jalan, "
                    "endpoint yang butuh DB akan error sampai koneksi pulih.",
                    max_wait,
                    exc,
                )
                return False
            logger.warning("Database belum siap (%s) — retry dalam %.0fs", exc, delay)
            time.sleep(delay)
            delay = min(delay * 1.5, 10.0)


def _validate_secrets() -> None:
    weak_secrets = {
        "dev-only-secret-change-me",
        "dev-only-cron-secret-change-me",
        "change-me",
        "change-me-to-a-long-random-hex-string",
    }
    if (
        not settings.jwt_secret
        or len(settings.jwt_secret) < 32
        or settings.jwt_secret in weak_secrets
    ):
        raise RuntimeError(
            "JWT_SECRET belum diatur aman. "
            "Set JWT_SECRET di .env (min 32 karakter random).\n"
            '  python -c "import secrets; print(secrets.token_hex(32))"'
        )
    if (
        not settings.cron_secret
        or len(settings.cron_secret) < 16
        or settings.cron_secret in weak_secrets
    ):
        raise RuntimeError(
            "CRON_SECRET belum diatur aman. "
            "Set CRON_SECRET di .env (min 16 karakter random).\n"
            '  python -c "import secrets; print(secrets.token_hex(16))"'
        )


def _validate_payment_gateway() -> None:
    """Production wajib punya kredensial Pakasir lengkap.

    Tanpa ini, backend bisa diam-diam memakai QRIS sandbox atau menerima
    webhook tanpa validasi secret — keduanya tidak boleh terjadi di production.
    """
    if not settings.is_production:
        return
    missing = [
        name
        for name, value in (
            ("PAKASIR_SLUG", settings.pakasir_slug),
            ("PAKASIR_API_KEY", settings.pakasir_api_key),
            ("PAKASIR_WEBHOOK_SECRET", settings.pakasir_webhook_secret),
        )
        if not (value or "").strip()
    ]
    if missing:
        raise RuntimeError(
            "Konfigurasi payment gateway Pakasir belum lengkap untuk mode "
            "production: " + ", ".join(missing) + ". "
            "Set nilainya di apps/api/.env agar QRIS tidak memakai mode sandbox "
            "dan webhook pembayaran tervalidasi."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Pesantren Tahfidz Qur'an dan Digital Arrahman API starting")
    _validate_secrets()
    _validate_payment_gateway()
    # Warm up Redis connection (non-fatal if unavailable)
    from src.core.cache import get_redis

    r = get_redis()
    if r:
        logger.info("Redis cache: connected")
    else:
        logger.warning(
            "Redis cache: NOT connected — rate limiter & session cache degraded. "
            "Set REDIS_URL in .env to enable."
        )

    threading.Thread(target=keep_db_alive, daemon=True).start()
    _wait_for_database()

    # Start automated PPDB background scheduler (Monthly installment reminders)
    from src.core.scheduler import start_scheduler, stop_scheduler

    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Pesantren Tahfidz Qur'an dan Digital Arrahman API",
    description=("Backend API (FastAPI) for the PTDARRAHMAN"),
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

# --- Route kustom /v1/models untuk mencegah 404 Not Found
# Route ini didaftar setelah app dibuat, sehingga tidak bentrok dengan
# decorator di atas dan akan serve response OK rather than 404.
@app.get("/v1/models", include_in_schema=False)
def custom_v1_models():
    return {"message": "Route /v1_models is intentionally served", "status": "ok"}


# --- CORS (env-driven, centralized in src/core/cors.py) ---
# NOTE: the 500-error middleware MUST be registered BEFORE CORSMiddleware so
# its responses flow back through CORS (otherwise 500s have no CORS headers
# and browsers report a misleading "blocked by CORS" error).
app.add_middleware(ServerErrorJSONMiddleware)
setup_cors(app, settings)


# --- Validation errors: kirim pesan pertama sebagai string biasa (bukan list
# teknis pydantic) supaya pesan validasi Indonesia terbaca langsung di frontend.
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    msg = (
        errors[0].get("msg", "Data yang dikirim tidak valid")
        if errors
        else "Data yang dikirim tidak valid"
    )
    msg = msg.replace("Value error, ", "")
    return JSONResponse(status_code=422, content={"detail": msg})


# --- Utility routes ---
@app.get("/health")
async def health():
    return {"status": "gwenchana", "service": "Ehemm President WNI"}


@app.get("/scalar", include_in_schema=False)
def get_scalar_docs():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title="PTDARRAHMAN API",
        dark_mode=True,
    )


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(content=FAVICON_SVG, media_type="image/svg+xml")


@app.get("/")
def read_root():
    return {
        "message": "Pesantren Tahfidz Qur'an dan Digital Arrahman API",
        "version": "0.1.0",
        "docs": "/scalar",
    }


# --- Routers ---
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(roles_router, prefix="/roles", tags=["Roles"])
app.include_router(superadmin_router, prefix="/superadmin", tags=["Superadmin"])
app.include_router(
    companyprofile_router, prefix="/companyprofile", tags=["Company Profile"]
)
app.include_router(modules_router, prefix="/modules", tags=["Modules"])
app.include_router(ppdb_router, prefix="/ppdb", tags=["PPDB"])
app.include_router(payment_router, prefix="/payment", tags=["Payment"])
app.include_router(
    notifications_router, prefix="/notifications", tags=["Notifications"]
)
app.include_router(selection_router, prefix="/selection", tags=["Selection"])
app.include_router(whatsapp_router, prefix="/whatsapp", tags=["WhatsApp"])
app.include_router(search_router, prefix="/search", tags=["Search"])
if settings.upload_provider == "db":
    app.include_router(uploads_router, tags=["Uploads"])
elif settings.upload_provider == "local":
    import os

    from fastapi.staticfiles import StaticFiles

    class DownloadStaticFiles(StaticFiles):
        """StaticFiles that forces downloads (never executes served content).

        Uploaded files may be attacker-controlled; even with magic-byte checks
        a browser should not render them inline. `Content-Disposition: attachment`
        plus `X-Content-Type-Options: nosniff` prevents stored-XSS via SVG/HTML.
        """

        def file_response(self, *args, **kwargs):
            response = super().file_response(*args, **kwargs)
            response.headers["Content-Disposition"] = "attachment"
            response.headers["X-Content-Type-Options"] = "nosniff"
            return response

    os.makedirs(settings.upload_dir, exist_ok=True)
    app.mount(
        "/uploads",
        DownloadStaticFiles(directory=settings.upload_dir),
        name="uploads",
    )
