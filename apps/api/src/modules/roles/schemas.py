from typing import Any

from pydantic import BaseModel


class RoleCreate(BaseModel):
    name: str
    description: str | None = None
    permissions: dict[str, Any] | None = None
    is_superadmin: bool | int | None = None


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permissions: dict[str, Any] | None = None
    is_superadmin: bool | int | None = None
