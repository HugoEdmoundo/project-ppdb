import json
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from src.core.database import create_record, delete_record, get_by_id, list_all, update_record
from src.core.dependencies import require_superadmin
from src.modules.roles.schemas import RoleCreate, RoleUpdate

router = APIRouter()


def _prepare(data: dict) -> dict:
    payload = dict(data)
    if "permissions" in payload and isinstance(payload["permissions"], dict):
        payload["permissions"] = json.dumps(payload["permissions"], ensure_ascii=False)
    if "is_superadmin" in payload:
        payload["is_superadmin"] = 1 if payload["is_superadmin"] else 0
    if "is_system" in payload:
        payload["is_system"] = 1 if payload["is_system"] else 0
    return payload


@router.get("/")
def get_roles(user: Dict[str, Any] = Depends(require_superadmin)):
    return list_all("roles", order="name")


@router.get("/{id}")
def get_role(id: str, user: Dict[str, Any] = Depends(require_superadmin)):
    role = get_by_id("roles", id)
    if not role:
        raise HTTPException(404, "Role not found")
    return role


@router.post("/", status_code=201)
def create_role(body: RoleCreate, user: Dict[str, Any] = Depends(require_superadmin)):
    data = body.model_dump(exclude_unset=True)
    data["is_system"] = False
    return create_record("roles", _prepare(data))


@router.put("/{id}")
def update_role(id: str, body: RoleUpdate, user: Dict[str, Any] = Depends(require_superadmin)):
    existing = get_by_id("roles", id)
    if not existing:
        raise HTTPException(404, "Role not found")
    if existing.get("is_system"):
        raise HTTPException(403, "Cannot edit a system role")
    data = body.model_dump(exclude_unset=True)
    data.pop("is_system", None)
    return update_record("roles", id, _prepare(data))


@router.delete("/{id}")
def delete_role(id: str, user: Dict[str, Any] = Depends(require_superadmin)):
    existing = get_by_id("roles", id)
    if not existing:
        raise HTTPException(404, "Role not found")
    if existing.get("is_system"):
        raise HTTPException(403, "Cannot delete a system role")
    try:
        deleted = delete_record("roles", id)
        if not deleted:
            raise HTTPException(404, "Role not found")
        return {"message": "Deleted"}
    except Exception as e:
        err = str(e)
        if "1451" in err or "ER_ROW_IS_REFERENCED_2" in err:
            raise HTTPException(409, "Cannot delete role because it is still in use by users")
        raise HTTPException(500, err)
