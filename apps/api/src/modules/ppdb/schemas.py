from datetime import date

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class PeriodCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    academic_year: str = Field(min_length=1, max_length=20)
    description: str | None = None


class PeriodUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    academic_year: str | None = Field(default=None, min_length=1, max_length=20)
    description: str | None = None


class TIUSettingsUpdate(BaseModel):
    google_form_url: str = Field(min_length=1, max_length=2048)
    duration_minutes: int = Field(ge=1, le=1440)
    webhook_secret: str | None = Field(default=None, min_length=16, max_length=255)

    @field_validator("google_form_url")
    @classmethod
    def validate_google_form_url(cls, value: str) -> str:
        from urllib.parse import urlparse

        parsed = urlparse(value.strip())
        if parsed.scheme != "https" or parsed.hostname not in {
            "docs.google.com",
            "forms.gle",
        }:
            raise ValueError("URL harus berupa Google Form HTTPS")
        return value.strip()


class TIUQuestionInput(BaseModel):
    model_config = {"extra": "forbid"}

    id: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=2000)
    options: list[str] = Field(min_length=2)
    correct_option_index: int = Field(ge=0)

    @field_validator("id", "title")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("wajib diisi")
        return value

    @field_validator("options")
    @classmethod
    def validate_options(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values]
        if any(not value for value in cleaned):
            raise ValueError("opsi jawaban tidak boleh kosong")
        if len({value.casefold() for value in cleaned}) != len(cleaned):
            raise ValueError("opsi jawaban tidak boleh duplikat")
        return cleaned

    @model_validator(mode="after")
    def correct_answer_must_exist(self):
        if self.correct_option_index >= len(self.options):
            raise ValueError("correct_option_index harus menunjuk salah satu opsi")
        return self


class TIUQuestionSyncPayload(BaseModel):
    model_config = {"extra": "forbid"}

    source_form_id: str = Field(min_length=1, max_length=200)
    questions: list[TIUQuestionInput] = Field(min_length=1)

    @field_validator("source_form_id")
    @classmethod
    def trim_form_id(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("source_form_id wajib diisi")
        return value

    @model_validator(mode="after")
    def question_ids_must_be_unique(self):
        ids = [question.id for question in self.questions]
        if len(ids) != len(set(ids)):
            raise ValueError("id soal harus unik")
        return self


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
    quota: int = Field(ge=1)
    early_discount_quota: int = Field(default=0, ge=0)
    registration_fee: int = Field(default=0, ge=0)
    # Tahap 2 (belum dipakai): None = jangan ubah nilai yang sudah ada
    second_stage_fee: int | None = Field(default=None, ge=0)
    minimum_dp: int = Field(default=0, ge=0)

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
            raise ValueError(
                "Tanggal akhir pendaftaran tidak boleh sebelum "
                "tanggal mulai pendaftaran"
            )
        if self.document_upload_end_date < self.registration_end_date:
            raise ValueError(
                "Batas upload dokumen tidak boleh sebelum tanggal akhir pendaftaran"
            )
        if self.selection_date < self.document_upload_end_date:
            raise ValueError("Jadwal seleksi tidak boleh sebelum batas upload dokumen")
        if self.early_discount_quota > self.quota:
            raise ValueError("Jumlah diskon pendaftar awal tidak boleh melebihi kuota")
        return self


class WaveCreate(WaveBase):
    period_id: str


class WaveUpdate(BaseModel):
    """Update parsial — hanya field yang dikirim yang diubah."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    allowed_paths: str | None = None
    allowed_levels: str | None = None
    registration_start_date: date | None = None
    registration_end_date: date | None = None
    document_upload_end_date: date | None = None
    selection_date: date | None = None
    quota: int | None = Field(default=None, ge=1)
    early_discount_quota: int | None = Field(default=None, ge=0)
    registration_fee: int | None = Field(default=None, ge=0)
    second_stage_fee: int | None = Field(default=None, ge=0)
    minimum_dp: int | None = Field(default=None, ge=0)

    @field_validator("allowed_paths")
    @classmethod
    def check_allowed_paths(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return normalize_scope_csv(v, ALLOWED_PATHS, "Jalur pendaftaran")

    @field_validator("allowed_levels")
    @classmethod
    def check_allowed_levels(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return normalize_scope_csv(v, ALLOWED_LEVELS, "Jenjang")


def _digits_or_none(value: str | None, length: int, label: str) -> str | None:
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
    gender: str | None = None
    birth_place: str | None = Field(default=None, max_length=100)
    birth_date: date | None = None
    nisn: str | None = None
    nik: str | None = None
    parent_name: str | None = Field(default=None, max_length=150)
    previous_school: str | None = Field(default=None, max_length=150)
    major_choice: str | None = Field(default=None, max_length=100)
    province: str = Field(min_length=1, max_length=100)
    city: str = Field(min_length=1, max_length=100)
    district: str = Field(min_length=1, max_length=100)
    village: str = Field(min_length=1, max_length=100)
    postal_code: str | None = Field(default=None, max_length=5)
    address: str = Field(min_length=5, max_length=500)
    disease_history: str | None = Field(default=None, max_length=255)

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
    def check_nisn(cls, v: str | None) -> str | None:
        return _digits_or_none(v, 10, "NISN")

    @field_validator("nik")
    @classmethod
    def check_nik(cls, v: str | None) -> str | None:
        return _digits_or_none(v, 16, "NIK")

    @field_validator("postal_code")
    @classmethod
    def check_postal_code(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        v = v.strip()
        if not v.isdigit() or len(v) != 5:
            raise ValueError("Kode pos harus 5 digit angka")
        return v

    @field_validator("birth_date")
    @classmethod
    def check_birth_date(cls, v: date | None) -> date | None:
        if v and v > date.today():
            raise ValueError("Tanggal lahir tidak boleh di masa depan")
        return v


class ApplicantPasswordReset(BaseModel):
    password: str


# ── CRUD pendaftar oleh Superadmin ───────────────────────────────────────────
# Konsep password TIDAK berubah: username & password tetap dibuat otomatis oleh
# sistem saat pendaftaran, dan perubahan password tetap lewat endpoint khusus
# (PUT /applicants/{id}/password). karena itu tidak ada field kredensial di
# bawah ini — hanya data profil, penempatan gelombang, dan status.


class ApplicantChangePath(BaseModel):
    registration_path: str = Field(min_length=1)

class ApplicantAdminCreate(ApplicantRegister):
    """Buat pendaftar dari panel Superadmin.

    Berbeda dari ``/ppdb/register`` (publik): tidak butuh gelombang aktif dan
    jalur/jenjang tidak dibatasi ``allowed_paths``/``allowed_levels``, karena
    admin yang memutuskan. ``wave_id`` wajib diisi eksplisit supaya pendaftar
    selalu punya label periode & gelombang.

    Sengaja TIDAK ada field password/username: konsep kredensial tetap sama
    dengan pendaftaran publik, yaitu dibuat otomatis oleh sistem. Password hanya
    dikembalikan sekali di respons pembuatan, dan perubahan password hanya
    lewat ``PUT /applicants/{id}/password``.
    """

    wave_id: str = Field(min_length=1)


class ApplicantAdminUpdate(BaseModel):
    """Update sebagian data pembangun. Semua field opsional (partial update).

    ``exclude_unset`` dipakai di service supaya field yang tidak dikirim tetap
    menyimpan nilai lama.
    """

    wave_id: str | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=16)
    registration_path: str | None = None
    registration_level: str | None = None
    gender: str | None = None
    birth_place: str | None = Field(default=None, max_length=100)
    birth_date: date | None = None
    nisn: str | None = None
    nik: str | None = None
    parent_name: str | None = Field(default=None, max_length=150)
    previous_school: str | None = Field(default=None, max_length=150)
    major_choice: str | None = Field(default=None, max_length=100)
    province: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    village: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=5)
    address: str | None = Field(default=None, max_length=500)
    disease_history: str | None = Field(default=None, max_length=255)
    status: str | None = None
    payment_status: str | None = None
    rejection_reason: str | None = None

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v.isdigit():
            raise ValueError("Nomor HP/WhatsApp hanya boleh angka")
        if not (9 <= len(v) <= 16):
            raise ValueError("Nomor HP/WhatsApp harus 9-16 digit angka")
        return v

    @field_validator("nisn")
    @classmethod
    def check_nisn(cls, v: str | None) -> str | None:
        return _digits_or_none(v, 10, "NISN")

    @field_validator("nik")
    @classmethod
    def check_nik(cls, v: str | None) -> str | None:
        return _digits_or_none(v, 16, "NIK")

    @field_validator("postal_code")
    @classmethod
    def check_postal_code(cls, v: str | None) -> str | None:
        return _digits_or_none(v, 5, "Kode pos")

    @field_validator("birth_date")
    @classmethod
    def check_birth_date(cls, v: date | None) -> date | None:
        if v and v > date.today():
            raise ValueError("Tanggal lahir tidak boleh di masa depan")
        return v


class WaveFeeItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    nominal: int = Field(ge=0)
    order_index: int = Field(default=0, ge=0)
    discount_type: str | None = Field(default=None, pattern=r"^(percent|nominal)$")
    discount_value: float | None = Field(default=None, gt=0)
    discount_scope: str = Field(default="all", pattern=r"^(all|first_x)$")

    @model_validator(mode="after")
    def validate_discount(self):
        if (self.discount_type is None) != (self.discount_value is None):
            raise ValueError("Tipe dan nilai diskon harus diisi bersama")
        if (
            self.discount_type == "percent"
            and self.discount_value is not None
            and self.discount_value > 100
        ):
            raise ValueError("Diskon persentase maksimal 100%")
        if self.discount_type is None and self.discount_scope != "all":
            raise ValueError("Pilih tipe dan nilai diskon untuk diskon pendaftar awal")
        return self


class WaveFeeItemUpdate(WaveFeeItemCreate):
    pass


class WaveMouTemplateUpdate(BaseModel):
    mou_template: str


class MouSignRequest(BaseModel):
    signature_data: str


class DocumentVerify(BaseModel):
    status: str = Field(pattern=r"^document_(approved|rejected)$")
    rejection_reason: str | None = None
