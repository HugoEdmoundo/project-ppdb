import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from scalar_fastapi import get_scalar_api_reference

from src.core.config import settings
from src.core.cors import setup_cors
from src.core.middleware import ServerErrorJSONMiddleware
from src.modules.auth.router import router as auth_router
from src.modules.companyprofile.router import router as companyprofile_router
from src.modules.modules.router import router as modules_router
from src.modules.notifications.router import router as notifications_router
from src.modules.payment.router import router as payment_router
from src.modules.ppdb.router import router as ppdb_router
from src.modules.roles.router import router as roles_router
from src.modules.selection.router import router as selection_router
from src.modules.superadmin.router import router as superadmin_router
from src.modules.uploads.router import router as uploads_router
from src.modules.users.router import router as users_router

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s"
)
logger = logging.getLogger("ptdarrahman")

FAVICON_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
    '<rect width="16" height="16" rx="4" fill="#0f172a"/>'
    '<text x="8" y="12" font-size="11" font-family="sans-serif" font-weight="bold" '
    'text-anchor="middle" fill="#34d399">A</text></svg>'
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Pesantren Tahfidz Qur'an dan Digital Arrahman API starting")
    yield


app = FastAPI(
    title="Pesantren Tahfidz Qur'an dan Digital Arrahman API",
    description="Backend API (FastAPI) for the PTDARRAHMAN company profile, PPDB, auth, and user/role management.",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


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
def health():
    return {"status": "gwenchana", "service": "geprek-service-engine-machine-wkwk"}


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
        "version": "2.0.0",
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
if settings.upload_provider == "db":
    app.include_router(uploads_router, tags=["Uploads"])
elif settings.upload_provider == "local":
    import os

    from fastapi.staticfiles import StaticFiles

    os.makedirs(settings.upload_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
