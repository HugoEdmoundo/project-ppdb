from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.dependencies import get_current_user, require_superadmin
from src.modules.auth.schemas import (
    LoginRequest,
    LoginResponse,
    ProfileUpdate,
    RecoverApplicantRequest,
    RecoverApplicantResponse,
    RefreshRequest,
    RefreshResponse,
    RegisterAdminRequest,
    RegisterApplicantRequest,
)
from src.repositories.auth_repository import AuthRepository
from src.services.auth_service import AuthService

router = APIRouter()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    repo = AuthRepository(db)
    return AuthService(repo)


@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    response: Response,
    service: AuthService = Depends(get_auth_service),
):
    result = service.login(body.username, body.password)
    response.set_cookie(
        key="access_token", value=result.access_token, httponly=True, samesite="lax"
    )
    if result.refresh_token:
        response.set_cookie(
            key="refresh_token",
            value=result.refresh_token,
            httponly=True,
            samesite="lax",
            max_age=30 * 24 * 60 * 60,
        )
    return result


@router.post("/refresh", response_model=RefreshResponse)
def refresh(
    request: Request,
    response: Response,
    body: RefreshRequest = None,
    service: AuthService = Depends(get_auth_service),
):
    refresh_token = body.refresh_token if body else request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    result = service.refresh(refresh_token)
    response.set_cookie(
        key="access_token", value=result.access_token, httponly=True, samesite="lax"
    )
    response.set_cookie(
        key="refresh_token",
        value=result.refresh_token,
        httponly=True,
        samesite="lax",
        max_age=30 * 24 * 60 * 60,
    )
    return result


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    body: RefreshRequest = None,
    service: AuthService = Depends(get_auth_service),
):
    refresh_token = body.refresh_token if body else request.cookies.get("refresh_token")
    if refresh_token:
        try:
            service.logout(refresh_token)
        except Exception:
            pass
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    return {"message": "Logged out successfully"}


@router.get("/me")
def get_me(
    user: dict[str, Any] = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    return service.get_me(user)


@router.put("/profile")
def update_profile(
    body: ProfileUpdate,
    user: dict[str, Any] = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    data = body.model_dump(exclude_unset=True)
    return service.update_profile(user, data)


@router.post("/register-applicant")
def register_applicant(
    body: RegisterApplicantRequest, service: AuthService = Depends(get_auth_service)
):
    from src.core.security import validate_password

    validate_password(body.password)
    return service.register_applicant(body.model_dump())


@router.post("/register")
def register_admin(
    body: RegisterAdminRequest,
    user: dict[str, Any] = Depends(require_superadmin),
    service: AuthService = Depends(get_auth_service),
):
    from src.core.security import validate_password

    validate_password(body.password)
    return service.register_admin(body.model_dump())


@router.post("/recover-applicant", response_model=RecoverApplicantResponse)
def recover_applicant(
    body: RecoverApplicantRequest, service: AuthService = Depends(get_auth_service)
):
    return service.recover_applicant(body.nik, body.birth_date)


@router.post("/upload")
async def upload(
    request: Request,
    user: dict[str, Any] = Depends(get_current_user),
    file: UploadFile = File(...),
):
    import uuid

    from src.core.database import create_record
    from src.core.uploads import upload_file

    record_id = str(uuid.uuid4())
    result = await upload_file(file, record_id)
    record = create_record(
        "file_uploads",
        {
            "id": record_id,
            "uploaded_by": user["id"],
            "original_name": result.original_name,
            "stored_name": result.storage_path.split("/")[-1],
            "mime_type": result.mime_type,
            "size_bytes": result.size_bytes,
            "storage_path": result.storage_path,
            "public_url": result.public_url,
        },
    )
    url = result.public_url
    if url.startswith("/"):
        url = f"{request.base_url}{url.lstrip('/')}"
    return {"url": url, "id": record.get("id")}
