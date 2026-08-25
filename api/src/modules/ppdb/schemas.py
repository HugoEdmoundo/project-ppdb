from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class PeriodCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    academic_year: str = Field(min_length=1, max_length=20)
    description: Optional[str] = None


class PeriodUpdate(PeriodCreate):
    pass


ALLOWED_PATHS = ("reguler", "pindahan")
ALLOWED_LEVELS = ("SMP", "SMK")


def normalize_scope_csv(value: str, allowed: tuple[str, ...], label: str) -> str:
    """Normalisasi string CSV scope (jalur/jenjang): buang spasi & duplikat,
    wajib minimal satu dan semua nilai harus dikenal sistem."""
    items: list[str] = []
    for raw in value.split(","):
        v = raw.strip()
        if v and v not in items:
            items.append(v)
    if not items:
        raise ValueError(f"{label} wajib dipilih minimal satu")
    unknown = [v for v in items if v not in allowed]
    if unknown:
        raise ValueError(f"{label} tidak valid: {', '.join(unknown)}")
    return ",".join(items)


class WaveBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    # CSV, contoh: "reguler,pindahan" / "SMP,SMK"
    allowed_paths: str
    allowed_levels: str
    registration_start_date: date
    registration_end_date: date
    document_upload_end_date: date
    selection_date: date
    quota: int = Field(ge=0)
    registration_fee: int = Field(default=0, ge=0)
    # Tahap 2 (belum dipakai): None = jangan ubah nilai yang sudah ada
    second_stage_fee: Optional[int] = Field(default=None, ge=0)

    @field_validator("allowed_paths")
    @classmethod
    def check_allowed_paths(cls, v: str) -> str:
        return normalize_scope_csv(v, ALLOWED_PATHS, "Jalur pendaftaran")

    @field_validator("allowed_levels")
    @classmethod
    def check_allowed_levels(cls, v: str) -> str:
        return normalize_scope_csv(v, ALLOWED_LEVELS, "Jenjang")

    @model_validator(mode="after")
    def check_schedule_order(self):
        if self.registration_end_date < self.registration_start_date:
            raise ValueError("Tanggal akhir pendaftaran tidak boleh sebelum tanggal mulai pendaftaran")
        if self.document_upload_end_date < self.registration_end_date:
            raise ValueError("Batas upload dokumen tidak boleh sebelum tanggal akhir pendaftaran")
        if self.selection_date < self.document_upload_end_date:
            raise ValueError("Jadwal seleksi tidak boleh sebelum batas upload dokumen")
        return self


class WaveCreate(WaveBase):
    period_id: str


class WaveUpdate(WaveBase):
    pass


def _digits_or_none(value: Optional[str], length: int, label: str) -> Optional[str]:
    """Validasi string opsional yang wajib berupa angka dengan panjang tetap."""
    if value is None or value == "":
        return None
    v = value.strip()
    if not v.isdigit() or len(v) != length:
        raise ValueError(f"{label} harus tepat {length} digit angka")
    return v


class ApplicantRegister(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    # Panjang & format divalidasi manual di bawah supaya pesan error konsisten
    phone: str = Field(max_length=16)
    registration_path: str
    registration_level: str
    gender: Optional[str] = None
    birth_place: Optional[str] = Field(default=None, max_length=100)
    birth_date: Optional[date] = None
    nisn: Optional[str] = None
    nik: Optional[str] = None
    parent_name: Optional[str] = Field(default=None, max_length=150)
    previous_school: Optional[str] = Field(default=None, max_length=150)
    major_choice: Optional[str] = Field(default=None, max_length=100)
    province: str = Field(min_length=1, max_length=100)
    city: str = Field(min_length=1, max_length=100)
    district: str = Field(min_length=1, max_length=100)
    village: str = Field(min_length=1, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=5)
    address: str = Field(min_length=5, max_length=500)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit():
            raise ValueError("Nomor HP/WhatsApp hanya boleh angka")
        if not (9 <= len(v) <= 16):
            raise ValueError("Nomor HP/WhatsApp harus 9-16 digit angka")
        return v

    @field_validator("nisn")
    @classmethod
    def check_nisn(cls, v: Optional[str]) -> Optional[str]:
        return _digits_or_none(v, 10, "NISN")

    @field_validator("nik")
    @classmethod
    def check_nik(cls, v: Optional[str]) -> Optional[str]:
        return _digits_or_none(v, 16, "NIK")

    @field_validator("postal_code")
    @classmethod
    def check_postal_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        v = v.strip()
        if not v.isdigit() or len(v) != 5:
            raise ValueError("Kode pos harus 5 digit angka")
        return v

    @field_validator("birth_date")
    @classmethod
    def check_birth_date(cls, v: Optional[date]) -> Optional[date]:
        if v and v > date.today():
            raise ValueError("Tanggal lahir tidak boleh di masa depan")
        return v


class ApplicantPasswordReset(BaseModel):
    password: Optional[str] = None
