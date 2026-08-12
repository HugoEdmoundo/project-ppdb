from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from scalar_fastapi import get_scalar_api_reference

from src.modules.auth.router import router as auth_router
from src.modules.users.router import router as users_router
from src.modules.roles.router import router as roles_router
from src.modules.superadmin.router import router as superadmin_router
from src.modules.companyprofile.router import router as companyprofile_router
from src.modules.modules.router import router as modules_router
from src.modules.ppdb.router import router as ppdb_router

app = FastAPI(
    title="Pesantren Tahfidz Qur'an dan Digital Arrahman API",
    description="Backend API (FastAPI) matching the Hono implementation",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
)

FAVICON_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
    '<rect width="16" height="16" rx="4" fill="#0f172a"/>'
    '<text x="8" y="12" font-size="11" font-family="sans-serif" font-weight="bold" '
    'text-anchor="middle" fill="#34d399">A</text></svg>'
)


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:5175", 
        "http://localhost:4173", 
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "message": "Pesantren Tahfidz Qur'an dan Digital Arrahman API",
        "version": "0.1.0",
        "naon sia?": "gelud, hayoo!"
    }

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(roles_router, prefix="/roles", tags=["Roles"])
app.include_router(superadmin_router, prefix="/superadmin", tags=["Superadmin"])
app.include_router(companyprofile_router, prefix="/companyprofile", tags=["Company Profile"])
app.include_router(modules_router, prefix="/modules", tags=["Modules"])
app.include_router(ppdb_router, prefix="/ppdb", tags=["PPDB"])
