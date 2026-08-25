"""
SQLAlchemy ORM models for the Selection module.

Tables:
  - selection_sessions   : jadwal sesi seleksi per gelombang
  - selection_results    : nilai + status kelulusan per pendaftar
"""

from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import BigInteger, Date, DateTime, Float, ForeignKey, String, Text, Time
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class SelectionSession(Base):
    __tablename__ = "selection_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    wave_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    session_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    start_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)   # "08:00"
    end_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)     # "12:00"
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SelectionResult(Base):
    __tablename__ = "selection_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # graduation: None = belum ditentukan, 'passed' = lulus, 'failed' = tidak lulus
    graduation_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    graduation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
