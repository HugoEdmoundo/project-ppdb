from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    user: Optional[Dict[str, Any]] = None

class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None

class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    old_password: Optional[str] = None
    new_password: Optional[str] = None

class RegisterApplicantRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)

class RegisterAdminRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)
    role_id: Optional[str] = None
    user_type: Optional[str] = None

class RecoverApplicantRequest(BaseModel):
    nik: str
    birth_date: str

class RecoverApplicantResponse(BaseModel):
    username: str
    new_password: str
