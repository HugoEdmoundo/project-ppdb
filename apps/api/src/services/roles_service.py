import json
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from src.models.auth import Role
from src.repositories.roles_repository import RolesRepository


class RolesService:
    def __init__(self, repository: RolesRepository):
        self.repository = repository
        self.wib = ZoneInfo("Asia/Jakarta")

    def _serialize_role(self, role: Role) -> dict:
        return {
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "is_superadmin": bool(role.is_superadmin),
            "is_system": bool(role.is_system),
            "permissions": role.permissions,
            "created_at": role.created_at.strftime("%Y-%m-%d %H:%M:%S")
            if role.created_at
            else None,
            "updated_at": role.updated_at.strftime("%Y-%m-%d %H:%M:%S")
            if role.updated_at
            else None,
        }

    def get_roles(self):
        roles = self.repository.get_all()
        return [self._serialize_role(r) for r in roles]

    def get_role(self, role_id: str):
        role = self.repository.get_by_id(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        return self._serialize_role(role)

    def create_role(self, data: dict):
        permissions = data.get("permissions")
        if isinstance(permissions, dict):
            permissions = json.dumps(permissions, ensure_ascii=False)

        now = datetime.now(self.wib)
        new_role = Role(
            id=str(uuid.uuid4()),
            name=data["name"],
            description=data.get("description"),
            is_superadmin=data.get("is_superadmin", False),
            is_system=False,
            permissions=permissions,
            created_at=now,
            updated_at=now,
        )

        try:
            created = self.repository.create(new_role)
        except IntegrityError:
            raise HTTPException(
                status_code=400, detail="Role with this name already exists"
            )

        return self._serialize_role(created)

    def update_role(self, role_id: str, data: dict):
        role = self.repository.get_by_id(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        if role.is_system:
            raise HTTPException(status_code=403, detail="Cannot edit a system role")

        if data.get("name") is not None:
            role.name = data["name"]
        if data.get("description") is not None:
            role.description = data["description"]
        if data.get("is_superadmin") is not None:
            role.is_superadmin = data["is_superadmin"]

        permissions = data.get("permissions")
        if permissions is not None:
            if isinstance(permissions, dict):
                permissions = json.dumps(permissions, ensure_ascii=False)
            role.permissions = permissions

        role.updated_at = datetime.now(self.wib)

        try:
            updated = self.repository.update(role)
        except IntegrityError:
            raise HTTPException(
                status_code=400, detail="Role with this name already exists"
            )

        return self._serialize_role(updated)

    def delete_role(self, role_id: str):
        role = self.repository.get_by_id(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        if role.is_system:
            raise HTTPException(status_code=403, detail="Cannot delete a system role")

        try:
            self.repository.delete(role)
        except IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="Cannot delete role because it is still in use by users",
            )
