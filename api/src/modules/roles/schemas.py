from pydantic import BaseModel
from typing import Optional, Dict, Any, Union

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    is_superadmin: Optional[Union[bool, int]] = None

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    is_superadmin: Optional[Union[bool, int]] = None
