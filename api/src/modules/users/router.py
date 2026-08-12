from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Dict, Any
from src.core.database import (
    list_all, get_by_id, create_record, update_record,
    delete_record, search_paginated, execute_raw
)
from src.core.security import hash_password
from src.modules.auth.dependencies import get_current_user, require_superadmin
from src.modules.users.schemas import UserCreate, UserUpdate, PagePermissionsUpdate
import uuid

router = APIRouter()

@router.get("/")
def get_users(
    search: str = Query(""),
    page: int = Query(1),
    per_page: int = Query(20),
    user: Dict[str, Any] = Depends(require_superadmin)
):
    if search:
        result = search_paginated(
            table="users",
            search=search,
            columns=["username", "email", "full_name"],
            page=page,
            per_page=per_page,
            order="created_at.desc"
        )
        return {
            "data": result["data"],
            "total": result["total"],
            "page": page,
            "per_page": per_page
        }
    return list_all("users", order="created_at.desc")

@router.get("/{id}")
def get_user(id: str, user: Dict[str, Any] = Depends(require_superadmin)):
    record = get_by_id("users", id)
    if not record:
        raise HTTPException(404, "User not found")
    return record

@router.post("/", status_code=201)
def create_user(body: UserCreate, user: Dict[str, Any] = Depends(require_superadmin)):
    import random
    import string
    
    raw_password = body.password
    generated = False
    if not raw_password:
        characters = string.ascii_letters + string.digits
        raw_password = ''.join(random.choice(characters) for i in range(8))
        generated = True
        
    data = {
        "username": body.username,
        "password_hash": hash_password(raw_password)
    }
    if body.email: data["email"] = body.email
    if body.full_name: data["full_name"] = body.full_name
    if body.role_id: data["role_id"] = body.role_id
    if body.user_type: data["user_type"] = body.user_type
    
    created = create_record("users", data)
    if generated:
        created["_generated_password"] = raw_password
    return created

@router.put("/{id}")
def update_user(id: str, body: UserUpdate, user: Dict[str, Any] = Depends(require_superadmin)):
    existing = get_by_id("users", id)
    if not existing:
        raise HTTPException(404, "User not found")
        
    data = {}
    if body.username: data["username"] = body.username
    if body.email: data["email"] = body.email
    if body.full_name: data["full_name"] = body.full_name
    if body.password: data["password_hash"] = hash_password(body.password)
    if body.role_id: data["role_id"] = body.role_id
    if body.user_type: data["user_type"] = body.user_type
    if body.is_active is not None:
        data["is_active"] = 1 if body.is_active else 0
        
    return update_record("users", id, data)

@router.delete("/{id}")
def delete_user(id: str, user: Dict[str, Any] = Depends(require_superadmin)):
    try:
        deleted = delete_record("users", id)
        if not deleted:
            raise HTTPException(404, "User not found")
        return {"message": "Deleted"}
    except Exception as e:
        err = str(e)
        if "1451" in err or "ER_ROW_IS_REFERENCED_2" in err:
            raise HTTPException(409, "Cannot delete user because they are still referenced by other records")
        raise HTTPException(500, err)

@router.get("/{id}/page-permissions")
def get_page_permissions(id: str, user: Dict[str, Any] = Depends(require_superadmin)):
    target_user = get_by_id("users", id)
    if not target_user:
        raise HTTPException(404, "User not found")
        
    rows = execute_raw(
        "SELECT page_id FROM user_page_permissions WHERE user_id = :user_id",
        {"user_id": id}
    )
    return {
        "user_id": id,
        "page_ids": [r["page_id"] for r in rows]
    }

@router.put("/{id}/page-permissions")
def update_page_permissions(id: str, body: PagePermissionsUpdate, user: Dict[str, Any] = Depends(require_superadmin)):
    target_user = get_by_id("users", id)
    if not target_user:
        raise HTTPException(404, "User not found")
        
    execute_raw("DELETE FROM user_page_permissions WHERE user_id = :user_id", {"user_id": id})
    
    if body.page_ids:
        # FastAPI / SQLAlchemy raw insert
        for page_id in body.page_ids:
            execute_raw(
                "INSERT INTO user_page_permissions (id, user_id, page_id, created_at) VALUES (:id, :user_id, :page_id, NOW())",
                {"id": str(uuid.uuid4()), "user_id": id, "page_id": page_id}
            )
            
    rows = execute_raw(
        "SELECT page_id FROM user_page_permissions WHERE user_id = :user_id",
        {"user_id": id}
    )
    
    result = {
        "user_id": id,
        "page_ids": [r["page_id"] for r in rows]
    }
    
    # Missing SSE emission logic here (could be added via a message broker in FastAPI)
    
    return result
