from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class PeriodCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    academic_year: str = Field(min_length=1, max_length=20)
    description: Optional[str] = None


class PeriodUpdate(PeriodCreate):
    pass


class WaveCreate(BaseModel):
    period_id: str
    name: str = Field(min_length=1, max_length=100)
    registration_start_date: date
    registration_end_date: date
    document_upload_end_date: date
    selection_date: date
    quota: int = Field(ge=0)
    registration_fee: int = Field(default=0, ge=0)
    second_stage_fee: int = Field(default=0, ge=0)


class WaveUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    registration_start_date: date
    registration_end_date: date
    document_upload_end_date: date
    selection_date: date
    quota: int = Field(ge=0)
    registration_fee: int = Field(default=0, ge=0)
    second_stage_fee: int = Field(default=0, ge=0)


class ApplicantRegister(BaseModel):
    full_name: str = Field(min_length=1)
    email: EmailStr
    phone: str = Field(min_length=1)
    registration_path: str
    registration_level: str
    gender: Optional[str] = None
    birth_place: Optional[str] = None
    birth_date: Optional[date] = None
    nisn: Optional[str] = None
    nik: Optional[str] = None
    parent_name: Optional[str] = None
    previous_school: Optional[str] = None
    major_choice: Optional[str] = None
    province: str = Field(min_length=1)
    city: str = Field(min_length=1)
    district: str = Field(min_length=1)
    village: str = Field(min_length=1)
    postal_code: Optional[str] = None
    address: str = Field(min_length=5)


class ApplicantPasswordReset(BaseModel):
    password: Optional[str] = None
