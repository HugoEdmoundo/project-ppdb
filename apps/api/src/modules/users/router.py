import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.dependencies import get_current_user, require_superadmin
from src.core.events import user_hubs
from src.modules.users.schemas import PagePermissionsUpdate, UserCreate, UserUpdate
from src.repositories.user_repository import UserRepository
from src.services.user_service import UserService

logger = logging.getLogger("ptdarrahman.users")

router = APIRouter()


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    repo = UserRepository(db)
    return UserService(repo)


@router.get("/")
def get_users(
    search: str = Query(""),
    page: int = Query(1),
    per_page: int = Query(20),
    user_service: UserService = Depends(get_user_service),
    user: dict[str, Any] = Depends(require_superadmin),
):
    return user_service.get_users_paginated(search, page, per_page)


@router.get("/{id}")
def get_user(
    id: str,
    user_service: UserService = Depends(get_user_service),
    user: dict[str, Any] = Depends(require_superadmin),
):
    return user_service.get_user(id)


@router.post("/", status_code=201)
def create_user(
    body: UserCreate,
    user_service: UserService = Depends(get_user_service),
    user: dict[str, Any] = Depends(require_superadmin),
):
    data = body.model_dump(exclude_unset=True)
    return user_service.create_user(data)


@router.put("/{id}")
def update_user(
    id: str,
    body: UserUpdate,
    user_service: UserService = Depends(get_user_service),
    user: dict[str, Any] = Depends(require_superadmin),
):
    data = body.model_dump(exclude_unset=True)
    return user_service.update_user(id, data)


@router.delete("/{id}")
def delete_user(
    id: str,
    user_service: UserService = Depends(get_user_service),
    user: dict[str, Any] = Depends(require_superadmin),
):
    user_service.delete_user(id, current_user_id=user.get("id"))
    return {"message": "Deleted"}


@router.get("/{user_id}/events")
async def user_events(
    user_id: str,
    request: Request,
    user: dict[str, Any] = Depends(get_current_user),
):
    is_superadmin = user.get("user_type") == "superadmin" or bool(
        user.get("is_superadmin")
    )
    if user.get("id") != user_id and not is_superadmin:
        raise HTTPException(status_code=403, detail="Access denied")
    return await user_hubs.get(user_id).stream(request)


@router.get("/{id}/page-permissions")
def get_page_permissions(
    id: str,
    user_service: UserService = Depends(get_user_service),
    user: dict[str, Any] = Depends(require_superadmin),
):
    return user_service.get_page_permissions(id)


@router.put("/{id}/page-permissions")
def update_page_permissions(
    id: str,
    body: PagePermissionsUpdate,
    user_service: UserService = Depends(get_user_service),
    user: dict[str, Any] = Depends(require_superadmin),
):
    return user_service.update_page_permissions(id, body.page_ids)
