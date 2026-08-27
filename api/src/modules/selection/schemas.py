from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    session_date: Optional[str] = None   # "YYYY-MM-DD"
    start_time: Optional[str] = None     # "HH:MM"
    end_time: Optional[str] = None       # "HH:MM"
    location: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    quota: int = 0  # 0 means unlimited


class SessionUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    session_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    quota: int = 0


class BookSession(BaseModel):
    session_id: str


class BroadcastSession(BaseModel):
    message: str


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class CriteriaCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    


class ScoreInputItem(BaseModel):
    criteria_id: str
    score: float


class ApplicantScoreSave(BaseModel):
    applicant_id: str
    scores: List[ScoreInputItem]
    notes: Optional[str] = None  # saved to selection_results


class ApplicantStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None
