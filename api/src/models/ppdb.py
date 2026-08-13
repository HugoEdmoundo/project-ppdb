from datetime import date, datetime
from typing import Optional

from sqlalchemy import BigInteger, Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.mysql import DATETIME
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class PPDBPeriod(Base):
    __tablename__ = "ppdb_periods"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    academic_year: Mapped[Optional[str]] = mapped_column(String(20))
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="inactive")
    created_at: Mapped[datetime] = mapped_column(DATETIME, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DATETIME, nullable=False)


class PPDBWave(Base):
    __tablename__ = "ppdb_waves"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    period_id: Mapped[str] = mapped_column(String(50), ForeignKey("ppdb_periods.id", ondelete="CASCADE"))
    wave_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    registration_start_date: Mapped[Optional[date]] = mapped_column(Date)
    registration_end_date: Mapped[Optional[date]] = mapped_column(Date)
    document_upload_end_date: Mapped[Optional[date]] = mapped_column(Date)
    selection_date: Mapped[Optional[date]] = mapped_column(Date)
    quota: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="inactive")
    created_at: Mapped[datetime] = mapped_column(DATETIME, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DATETIME, nullable=False)


class PPDBApplicant(Base):
    __tablename__ = "ppdb_applicants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    wave_id: Mapped[str] = mapped_column(String(36), ForeignKey("ppdb_waves.id"))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    registration_path: Mapped[str] = mapped_column(String(50), nullable=False)
    registration_level: Mapped[str] = mapped_column(String(50), nullable=False)
    birth_place: Mapped[Optional[str]] = mapped_column(String(100))
    birth_date: Mapped[Optional[date]] = mapped_column(Date)
    gender: Mapped[Optional[str]] = mapped_column(String(10))
    nisn: Mapped[Optional[str]] = mapped_column(String(50))
    nik: Mapped[Optional[str]] = mapped_column(String(50))
    parent_name: Mapped[Optional[str]] = mapped_column(String(255))
    previous_school: Mapped[Optional[str]] = mapped_column(String(255))
    major_choice: Mapped[Optional[str]] = mapped_column(String(100))
    address: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="pending_payment")
    created_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)


class FileUpload(Base):
    __tablename__ = "file_uploads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    public_url: Mapped[Optional[str]] = mapped_column(String(500))
    entity_type: Mapped[Optional[str]] = mapped_column(String(50))
    entity_id: Mapped[Optional[str]] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    nisn: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    nis: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    gender: Mapped[str] = mapped_column(String(10), default="L")
    birth_place: Mapped[str] = mapped_column(String(255), default="")
    birth_date: Mapped[Optional[date]] = mapped_column(Date)
    address: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(String(50), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    father_name: Mapped[str] = mapped_column(String(255), default="")
    mother_name: Mapped[str] = mapped_column(String(255), default="")
    father_occupation: Mapped[str] = mapped_column(String(255), default="")
    mother_occupation: Mapped[str] = mapped_column(String(255), default="")
    parent_phone: Mapped[str] = mapped_column(String(50), default="")
    photo: Mapped[str] = mapped_column(String(255), default="")
    previous_school: Mapped[str] = mapped_column(String(255), default="")
    registration_number: Mapped[str] = mapped_column(String(100), default="")
    registration_date: Mapped[Optional[datetime]] = mapped_column(DATETIME(fsp=3))
    program: Mapped[str] = mapped_column(String(255), default="")
    class_name: Mapped[str] = mapped_column(String(255), default="")
    academic_year: Mapped[str] = mapped_column(String(20), default="")
    status: Mapped[str] = mapped_column(String(20), default="active")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)


class SPPBill(Base):
    __tablename__ = "spp_bills"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"))
    bill_month: Mapped[int] = mapped_column(Integer, nullable=False)
    bill_year: Mapped[int] = mapped_column(Integer, nullable=False)
    nominal: Mapped[int] = mapped_column(BigInteger, default=0)
    total_paid: Mapped[int] = mapped_column(BigInteger, default=0)
    status: Mapped[str] = mapped_column(String(20), default="unpaid")
    due_date: Mapped[Optional[datetime]] = mapped_column(DATETIME(fsp=3))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)


class SPPPayment(Base):
    __tablename__ = "spp_payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"))
    bill_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("spp_bills.id", ondelete="SET NULL"))
    amount: Mapped[int] = mapped_column(BigInteger, default=0)
    payment_method: Mapped[str] = mapped_column(String(50), default="cash")
    proof_type: Mapped[Optional[str]] = mapped_column(String(50))
    proof_url: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    confirmed_by: Mapped[Optional[str]] = mapped_column(String(36))
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DATETIME(fsp=3))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    paid_by: Mapped[Optional[str]] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)


class SPPSetting(Base):
    __tablename__ = "spp_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    class_name: Mapped[str] = mapped_column(String(255), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)
    nominal: Mapped[int] = mapped_column(BigInteger, default=0)
    is_active: Mapped[bool] = mapped_column("is_active", nullable=True)
    created_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)


class RateLimit(Base):
    __tablename__ = "rate_limits"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    timestamp: Mapped[int] = mapped_column(BigInteger, primary_key=True)
