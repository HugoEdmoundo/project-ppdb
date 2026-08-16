import random
import string
import uuid
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query

from src.core.database import (
    create_record,
    delete_record,
    execute_raw,
    get_by_id,
    update_record,
)
from src.core.dependencies import require_superadmin
from src.core.security import hash_password
from src.modules.users.schemas import PagePermissionsUpdate, UserCreate, UserUpdate

router = APIRouter()


def _generate_password(length: int = 8) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(random.choice(chars) for _ in range(length))


@router.get("/")
def get_users(
    search: str = Query(""),
    page: int = Query(1),
    per_page: int = Query(20),
    user: Dict[str, Any] = Depends(require_superadmin),
):
    # Akun calon murid dikelola lewat halaman Pendaftar, bukan Users.
    where = "WHERE (user_type IS NULL OR user_type != 'applicant')"
    params: dict[str, Any] = {}

    if search:
        where += " AND (username LIKE :s OR email LIKE :s OR full_name LIKE :s)"
        params["s"] = f"%{search}%"

    rows = execute_raw(
        f"SELECT * FROM users {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset",
        {**params, "limit": per_page, "offset": (page - 1) * per_page},
    )
    count_rows = execute_raw(f"SELECT COUNT(*) AS cnt FROM users {where}", params)
    return {
        "data": rows,
        "total": count_rows[0]["cnt"] if count_rows else 0,
        "page": page,
        "per_page": per_page,
    }


@router.get("/{id}")
def get_user(id: str, user: Dict[str, Any] = Depends(require_superadmin)):
    record = get_by_id("users", id)
    if not record:
        raise HTTPException(404, "User not found")
    return record


@router.post("/", status_code=201)
def create_user(body: UserCreate, user: Dict[str, Any] = Depends(require_superadmin)):
    raw_password = body.password or _generate_password()
    generated = not body.password

    data: dict[str, Any] = {
        "username": body.username,
        "password_hash": hash_password(raw_password),
    }
    if body.email:
        data["email"] = body.email
    if body.full_name:
        data["full_name"] = body.full_name
    if body.role_id:
        data["role_id"] = body.role_id
    if body.user_type:
        data["user_type"] = body.user_type

    created = create_record("users", data)
    if generated:
        created["_generated_password"] = raw_password
    return created


@router.put("/{id}")
def update_user(id: str, body: UserUpdate, user: Dict[str, Any] = Depends(require_superadmin)):
    existing = get_by_id("users", id)
    if not existing:
        raise HTTPException(404, "User not found")

    data: dict[str, Any] = {}
    if body.username:
        data["username"] = body.username
    if body.email:
        data["email"] = body.email
    if body.full_name:
        data["full_name"] = body.full_name
    if body.password:
        data["password_hash"] = hash_password(body.password)
    if body.role_id:
        data["role_id"] = body.role_id
    if body.user_type:
        data["user_type"] = body.user_type
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
    rows = execute_raw("SELECT page_id FROM user_page_permissions WHERE user_id = :user_id", {"user_id": id})
    return {"user_id": id, "page_ids": [r["page_id"] for r in rows]}


@router.put("/{id}/page-permissions")
def update_page_permissions(id: str, body: PagePermissionsUpdate, user: Dict[str, Any] = Depends(require_superadmin)):
    target_user = get_by_id("users", id)
    if not target_user:
        raise HTTPException(404, "User not found")

    execute_raw("DELETE FROM user_page_permissions WHERE user_id = :user_id", {"user_id": id})
    for page_id in body.page_ids:
        execute_raw(
            "INSERT INTO user_page_permissions (id, user_id, page_id, created_at) VALUES (:id, :user_id, :page_id, NOW(3))",
            {"id": str(uuid.uuid4()), "user_id": id, "page_id": page_id},
        )

    rows = execute_raw("SELECT page_id FROM user_page_permissions WHERE user_id = :user_id", {"user_id": id})
    return {"user_id": id, "page_ids": [r["page_id"] for r in rows]}
