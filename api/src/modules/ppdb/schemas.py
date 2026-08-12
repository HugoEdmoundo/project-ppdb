from typing import Optional, List, Any
from pydantic import BaseModel
from datetime import date

class PeriodCreate(BaseModel):
    name: str
    start_date: str
    end_date: str

class PeriodUpdate(BaseModel):
    name: str
    start_date: str
    end_date: str

class WaveCreate(BaseModel):
    period_id: str
    name: str
    start_date: str
    end_date: str

class WaveUpdate(BaseModel):
    name: str
    start_date: str
    end_date: str
