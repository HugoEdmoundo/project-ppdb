from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator, model_validator


class SessionFields(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    session_type: Literal["tahfidz", "interview"]
    session_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    start_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    mode: Literal["online", "offline"]
    officer_name: str = Field(min_length=1, max_length=150)
    location: str | None = Field(None, max_length=200)
    meeting_url: AnyHttpUrl | None = None
    description: str | None = None
    quota: int = Field(default=0, ge=0)  # 0 means unlimited

    @model_validator(mode="after")
    def validate_delivery_details(self):
        start = datetime.strptime(self.start_time, "%H:%M").time()
        end = datetime.strptime(self.end_time, "%H:%M").time()
        if end <= start:
            raise ValueError("Jam selesai harus setelah jam mulai")
        if self.mode == "online" and not self.meeting_url:
            raise ValueError("Tautan Zoom wajib diisi untuk sesi online")
        if self.mode == "offline" and not (self.location and self.location.strip()):
            raise ValueError("Lokasi wajib diisi untuk sesi offline")
        return self

    @field_validator("name", "officer_name")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Wajib diisi")
        return value


class SessionCreate(SessionFields):
    pass


class SessionUpdate(SessionFields):
    pass


class BookSession(BaseModel):
    session_id: str


class BroadcastSession(BaseModel):
    message: str


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class CriteriaCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    weight: float = Field(gt=0, le=100)


class CriteriaUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    weight: float = Field(gt=0, le=100)


class ScoreInputItem(BaseModel):
    criteria_id: str
    score: float


class ApplicantScoreSave(BaseModel):
    applicant_id: str
    scores: list[ScoreInputItem]
    notes: str | None = None  # saved to selection_results


class ApplicantStatusUpdate(BaseModel):
    status: str
    reason: str | None = None
