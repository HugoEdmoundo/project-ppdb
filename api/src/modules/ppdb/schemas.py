from typing import Optional, List, Any
from pydantic import BaseModel
from datetime import date

class PeriodCreate(BaseModel):
    name: str
    academic_year: str
    description: Optional[str] = None

class PeriodUpdate(BaseModel):
    name: str
    academic_year: str
    description: Optional[str] = None

class WaveCreate(BaseModel):
    period_id: str
    name: str
    registration_start_date: str
    registration_end_date: str
    document_upload_end_date: str
    selection_date: str
    quota: int

class WaveUpdate(BaseModel):
    name: str
    registration_start_date: str
    registration_end_date: str
    document_upload_end_date: str
    selection_date: str
    quota: int

class ApplicantRegister(BaseModel):
    full_name: str
    email: str
    phone: str
    registration_path: str
    registration_level: str
    gender: Optional[str] = None
    birth_place: Optional[str] = None
    birth_date: Optional[str] = None
    nisn: Optional[str] = None
    parent_name: Optional[str] = None
    previous_school: Optional[str] = None
    major_choice: Optional[str] = None

class ApplicantUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    birth_place: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
