from pydantic import BaseModel
from typing import Optional, List, Union

class UserCreate(BaseModel):
    username: str
    password: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    role_id: Optional[str] = None
    user_type: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    role_id: Optional[str] = None
    user_type: Optional[str] = None
    is_active: Optional[Union[bool, int]] = None

class PagePermissionsUpdate(BaseModel):
    page_ids: List[str]
