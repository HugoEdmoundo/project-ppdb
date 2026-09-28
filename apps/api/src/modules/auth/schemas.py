from typing import Any

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str
    user: dict[str, Any] | None = None


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class ProfileUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    full_name: str | None = None
    avatar_url: str | None = None
    old_password: str | None = None
    new_password: str | None = None


class RegisterApplicantRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)


class RegisterAdminRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr | None = None
    password: str = Field(min_length=8)
    role_id: str | None = None
    user_type: str | None = None


class RecoverApplicantRequest(BaseModel):
    nik: str
    birth_date: str


class RecoverApplicantResponse(BaseModel):
    message: str


class AccountRecoveryRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=255)


class AccountRecoveryVerify(BaseModel):
    identifier: str = Field(min_length=1, max_length=255)
    code: str = Field(min_length=6, max_length=6)
