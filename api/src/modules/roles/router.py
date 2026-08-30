from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.dependencies import require_superadmin
from src.modules.roles.schemas import RoleCreate, RoleUpdate
from src.repositories.roles_repository import RolesRepository
from src.services.roles_service import RolesService

router = APIRouter()

def get_roles_service(db: Session = Depends(get_db)) -> RolesService:
    repo = RolesRepository(db)
    return RolesService(repo)


@router.get("/")
def get_roles(
    user: Dict[str, Any] = Depends(require_superadmin),
    service: RolesService = Depends(get_roles_service)
):
    return service.get_roles()


@router.get("/{id}")
def get_role(
    id: str, 
    user: Dict[str, Any] = Depends(require_superadmin),
    service: RolesService = Depends(get_roles_service)
):
    return service.get_role(id)


@router.post("/", status_code=201)
def create_role(
    body: RoleCreate, 
    user: Dict[str, Any] = Depends(require_superadmin),
    service: RolesService = Depends(get_roles_service)
):
    data = body.model_dump(exclude_unset=True)
    return service.create_role(data)


@router.put("/{id}")
def update_role(
    id: str, 
    body: RoleUpdate, 
    user: Dict[str, Any] = Depends(require_superadmin),
    service: RolesService = Depends(get_roles_service)
):
    data = body.model_dump(exclude_unset=True)
    return service.update_role(id, data)


@router.delete("/{id}")
def delete_role(
    id: str, 
    user: Dict[str, Any] = Depends(require_superadmin),
    service: RolesService = Depends(get_roles_service)
):
    service.delete_role(id)
    return {"message": "Deleted"}
