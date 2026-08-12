from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import json
from src.core.database import list_all, get_by_id, create_record, update_record, delete_record
from src.modules.auth.dependencies import require_superadmin
from src.modules.roles.schemas import RoleCreate, RoleUpdate

router = APIRouter()

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
    if "permissions" in data and isinstance(data["permissions"], dict):
        data["permissions"] = json.dumps(data["permissions"])
    if "is_superadmin" in data:
        data["is_superadmin"] = 1 if data["is_superadmin"] else 0
        
    return create_record("roles", data)

@router.put("/{id}")
def update_role(id: str, body: RoleUpdate, user: Dict[str, Any] = Depends(require_superadmin)):
    existing = get_by_id("roles", id)
    if not existing:
        raise HTTPException(404, "Role not found")
        
    data = body.model_dump(exclude_unset=True)
    if "permissions" in data and isinstance(data["permissions"], dict):
        data["permissions"] = json.dumps(data["permissions"])
    if "is_superadmin" in data:
        data["is_superadmin"] = 1 if data["is_superadmin"] else 0
        
    return update_record("roles", id, data)

@router.delete("/{id}")
def delete_role(id: str, user: Dict[str, Any] = Depends(require_superadmin)):
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
