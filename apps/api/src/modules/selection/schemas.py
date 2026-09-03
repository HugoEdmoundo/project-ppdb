from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    session_date: str | None = None  # "YYYY-MM-DD"
    start_time: str | None = None  # "HH:MM"
    end_time: str | None = None  # "HH:MM"
    location: str | None = Field(None, max_length=200)
    description: str | None = None
    quota: int = 0  # 0 means unlimited


class SessionUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    session_date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    location: str | None = Field(None, max_length=200)
    description: str | None = None
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
    scores: list[ScoreInputItem]
    notes: str | None = None  # saved to selection_results


class ApplicantStatusUpdate(BaseModel):
    status: str
    reason: str | None = None
