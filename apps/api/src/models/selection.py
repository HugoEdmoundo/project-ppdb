"""
SQLAlchemy ORM models for the Selection module.

Tables:
  - selection_sessions   : jadwal sesi seleksi per gelombang
  - selection_results    : nilai + status kelulusan per pendaftar
"""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class SelectionSession(Base):
    __tablename__ = "selection_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    wave_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    session_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_time: Mapped[str | None] = mapped_column(String(10), nullable=True)  # "08:00"
    end_time: Mapped[str | None] = mapped_column(String(10), nullable=True)  # "12:00"
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    quota: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SelectionResult(Base):
    __tablename__ = "selection_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    session_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, index=True
    )
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # graduation: None = belum ditentukan, 'passed' = lulus, 'failed' = tidak lulus
    graduation_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    graduation_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SelectionCategory(Base):
    __tablename__ = "selection_categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    wave_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SelectionCriteria(Base):
    __tablename__ = "selection_criteria"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    category_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SelectionScore(Base):
    __tablename__ = "selection_scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    criteria_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
