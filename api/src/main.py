from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    version="1.0.0"
)

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
        "status": "ok"
    }

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(roles_router, prefix="/roles", tags=["Roles"])
app.include_router(superadmin_router, prefix="/superadmin", tags=["Superadmin"])
app.include_router(companyprofile_router, prefix="/companyprofile", tags=["Company Profile"])
app.include_router(modules_router, prefix="/modules", tags=["Modules"])
app.include_router(ppdb_router, prefix="/ppdb", tags=["PPDB"])
