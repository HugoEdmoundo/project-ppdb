import logging
import random
import string
import uuid
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError

from src.core.notif_service import send_notification, send_notifications
from src.core.security import hash_password
from src.models.auth import User
from src.models.ppdb import (
    PPDBBMOU,
    PPDBApplicant,
    PPDBPaymentTransaction,
    PPDBPeriod,
    PPDBWave,
    PPDBWaveFeeItem,
)
from src.modules.ppdb.schemas import (
    ApplicantAdminCreate,
    ApplicantAdminUpdate,
    ApplicantRegister,
    MouSignRequest,
    PeriodCreate,
    PeriodUpdate,
    WaveCreate,
    WaveFeeItemCreate,
    WaveFeeItemUpdate,
    WaveMouTemplateUpdate,
    WaveUpdate,
)
from src.repositories.ppdb_repository import PPDBRepository

WIB = ZoneInfo("Asia/Jakarta")

logger = logging.getLogger("ptdarrahman.ppdb")

# Nama dokumen wajib (disinkronkan dengan REQUIRED_DOCUMENTS di frontend).
REQUIRED_DOCUMENTS = [
    "Ijazah atau SKL",
    "Akta Kelahiran",
    "Kartu Keluarga (KK)",
    "KTP Orang Tua/Wali",
    "Rapor (Semester 3 dari 4 Terakhir)",
    "Rapor (Semester 4 dari 4 Terakhir)",
    "Rapor (Semester 5 dari 4 Terakhir)",
    "Rapor (Semester 6 dari 4 Terakhir)",
    "Pas Foto",
    "Surat Pernyataan Orang Tua",
    "Medical Checkup",
]

# Status tempat pendaftar boleh mengunggah/kirim dokumen.
_DOCUMENT_UPLOAD_STATUSES = {"document_uploaded_pending", "document_rejected"}


class PPDBService:
    def __init__(self, repository: PPDBRepository):
        self.repository = repository

    # -------------------------------------------------------------------------
    # Periods
    # -------------------------------------------------------------------------
    def get_periods(self, page: int, per_page: int, search: str) -> dict[str, Any]:
        data, total = self.repository.get_periods_paginated(search, page, per_page)
        return {"data": data, "total": total}

    def get_all_periods(self):
        periods = self.repository.get_all_periods()
        return [
            {
                "id": p.id,
                "name": p.name,
                "status": p.status,
                "academic_year": p.academic_year,
            }
            for p in periods
        ]

    def get_period_by_id(self, period_id: str) -> dict[str, Any]:
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Not found")

        waves = self.repository.get_waves_by_period(period_id)

        # map to dict
        p_dict = {c.name: getattr(period, c.name) for c in period.__table__.columns}
        p_dict["waves"] = [
            {c.name: getattr(w, c.name) for c in w.__table__.columns} for w in waves
        ]
        return p_dict

    def create_period(self, body: PeriodCreate):
        period = PPDBPeriod(
            id=f"period-{uuid.uuid4()}",
            name=body.name,
            academic_year=body.academic_year,
            description=body.description,
            status="inactive",
            created_at=datetime.now(WIB),
            updated_at=datetime.now(WIB),
        )
        self.repository.create_period(period)
        return {c.name: getattr(period, c.name) for c in period.__table__.columns}

    def update_period(self, period_id: str, body: PeriodUpdate):
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Not found")

        provided = body.model_dump(exclude_unset=True)
        if not provided:
            raise HTTPException(status_code=400, detail="Tidak ada field untuk diubah")
        if provided.get("name") is not None:
            period.name = provided["name"]
        if provided.get("academic_year") is not None:
            period.academic_year = provided["academic_year"]
        if "description" in provided:
            period.description = provided["description"]
        period.updated_at = datetime.now(WIB)

        self.repository.update_period(period)
        return {c.name: getattr(period, c.name) for c in period.__table__.columns}

    def activate_period(self, period_id: str):
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Periode tidak ditemukan")
        self.repository.activate_period(period_id)
        return {"success": True}

    def deactivate_period(self, period_id: str):
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Periode tidak ditemukan")
        self.repository.deactivate_period(period_id)
        return {"success": True}

    def delete_period(self, period_id: str):
        period = self.repository.get_period_by_id(period_id)
        if period:
            if self.repository.count_applicants_in_period(period_id) > 0:
                raise HTTPException(
                    status_code=400,
                    detail="Periode memiliki pendaftar dan tidak bisa dihapus",
                )
            self.repository.delete_period(period)
        return {"success": True}

    # -------------------------------------------------------------------------
    # Waves
    # -------------------------------------------------------------------------
    def get_waves(self, period_id: str | None = None):
        waves = self.repository.get_waves(period_id)
        result = []
        for w in waves:
            item = {c.name: getattr(w, c.name) for c in w.__table__.columns}
            item["filled"] = self.repository.count_paid_form_payments_in_wave(w.id)
            result.append(item)
        return result

    def get_all_waves(self):
        waves = self.repository.get_waves()
        return [
            {c.name: getattr(w, c.name) for c in w.__table__.columns} for w in waves
        ]

    def get_active_wave_public(self) -> dict[str, Any]:
        wave = self.repository.get_active_wave()
        if not wave:
            return {"active": False}

        # `academic_year` & `name` periode lived di tabel induk, jadi wave saja
        # tidak cukup untuk situs publik yang menampilkan "Tahun Ajaran ...".
        period = self.repository.get_period_by_id(wave.period_id)
        today = datetime.now(WIB).date()
        paid_count = self.repository.count_paid_form_payments_in_wave(wave.id)
        has_schedule = bool(wave.registration_start_date and wave.registration_end_date)
        before_open = has_schedule and today < wave.registration_start_date
        after_close = has_schedule and today > wave.registration_end_date
        quota_reached = wave.quota <= 0 or paid_count >= wave.quota
        registration_open = (
            period is not None
            and period.status == "active"
            and has_schedule
            and not before_open
            and not after_close
            and not quota_reached
        )

        return {
            # Public `active` means ready and currently accepting registrations.
            "active": registration_open,
            "registration_open": registration_open,
            "registration_status": (
                "schedule_incomplete"
                if not has_schedule
                else "not_started"
                if before_open
                else "closed"
                if after_close
                else "quota_reached"
                if quota_reached
                else "open"
            ),
            "id": wave.id,
            "name": wave.name,
            "period_id": wave.period_id,
            "period_name": period.name if period else None,
            "academic_year": period.academic_year if period else None,
            "quota": wave.quota,
            "paid_count": paid_count,
            "registration_start_date": wave.registration_start_date,
            "registration_end_date": wave.registration_end_date,
            "document_upload_end_date": wave.document_upload_end_date,
            "selection_date": wave.selection_date,
            "allowed_paths": [
                p.strip() for p in (wave.allowed_paths or "").split(",") if p.strip()
            ],
            "allowed_levels": [
                lvl.strip()
                for lvl in (wave.allowed_levels or "").split(",")
                if lvl.strip()
            ],
        }

    def get_wave_by_id(self, wave_id: str) -> dict[str, Any]:
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Not found")
        return {c.name: getattr(wave, c.name) for c in wave.__table__.columns}

    def create_wave(self, body: WaveCreate):
        period = self.repository.get_period_by_id(body.period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Period not found")

        max_num = self.repository.get_max_wave_number(body.period_id)
        wave_number = max_num + 1

        wave = PPDBWave(
            id=f"wave-{uuid.uuid4()}",
            period_id=body.period_id,
            wave_number=wave_number,
            name=body.name,
            allowed_paths=body.allowed_paths,
            allowed_levels=body.allowed_levels,
            registration_start_date=body.registration_start_date,
            registration_end_date=body.registration_end_date,
            document_upload_end_date=body.document_upload_end_date,
            selection_date=body.selection_date,
            quota=body.quota,
            early_discount_quota=body.early_discount_quota,
            registration_fee=body.registration_fee,
            minimum_dp=body.minimum_dp,
            second_stage_fee=body.second_stage_fee
            if body.second_stage_fee is not None
            else 0,
            status="inactive",
            created_at=datetime.now(WIB),
            updated_at=datetime.now(WIB),
        )
        self.repository.create_wave(wave)
        return {c.name: getattr(wave, c.name) for c in wave.__table__.columns}

    def update_wave(self, wave_id: str, body: WaveUpdate):
        from datetime import date as date_type

        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Not found")

        provided = body.model_dump(exclude_unset=True)
        if not provided:
            raise HTTPException(status_code=400, detail="Tidak ada field untuk diubah")

        def _as_date(value, fallback):
            if value is None:
                value = fallback
            if isinstance(value, datetime):
                return value.date()
            if isinstance(value, date_type):
                return value
            if value is None:
                return None
            return date_type.fromisoformat(str(value))

        effective = {
            "registration_start_date": _as_date(
                provided.get("registration_start_date"),
                wave.registration_start_date,
            ),
            "registration_end_date": _as_date(
                provided.get("registration_end_date"), wave.registration_end_date
            ),
            "document_upload_end_date": _as_date(
                provided.get("document_upload_end_date"),
                wave.document_upload_end_date,
            ),
            "selection_date": _as_date(
                provided.get("selection_date"), wave.selection_date
            ),
        }
        if (
            effective["registration_end_date"] is not None
            and effective["registration_start_date"] is not None
            and effective["registration_end_date"]
            < effective["registration_start_date"]
        ):
            raise HTTPException(
                status_code=400,
                detail="Tanggal akhir pendaftaran tidak boleh sebelum tanggal mulai",
            )
        if (
            effective["document_upload_end_date"] is not None
            and effective["registration_end_date"] is not None
            and effective["document_upload_end_date"]
            < effective["registration_end_date"]
        ):
            raise HTTPException(
                status_code=400,
                detail="Batas upload dokumen tidak boleh sebelum akhir pendaftaran",
            )
        if (
            effective["selection_date"] is not None
            and effective["document_upload_end_date"] is not None
            and effective["selection_date"] < effective["document_upload_end_date"]
        ):
            raise HTTPException(
                status_code=400,
                detail="Jadwal seleksi tidak boleh sebelum batas upload dokumen",
            )

        effective_quota = provided.get("quota", wave.quota)
        effective_early_discount_quota = provided.get(
            "early_discount_quota", wave.early_discount_quota or 0
        )
        if effective_early_discount_quota > effective_quota:
            raise HTTPException(
                status_code=400,
                detail="Jumlah diskon pendaftar awal tidak boleh melebihi kuota",
            )

        for field in (
            "name",
            "allowed_paths",
            "allowed_levels",
            "registration_start_date",
            "registration_end_date",
            "document_upload_end_date",
            "selection_date",
            "quota",
            "early_discount_quota",
            "registration_fee",
            "second_stage_fee",
            "minimum_dp",
        ):
            if field in provided and provided[field] is not None:
                setattr(wave, field, provided[field])
        wave.updated_at = datetime.now(WIB)

        self.repository.update_wave(wave)
        return {c.name: getattr(wave, c.name) for c in wave.__table__.columns}

    def activate_wave(self, wave_id: str):
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Wave not found")

        period = self.repository.get_period_by_id(wave.period_id)
        if not period or period.status != "active":
            raise HTTPException(status_code=400, detail="Periode belum aktif")

        self.repository.activate_wave(wave_id, wave.period_id)
        return {"success": True}

    def deactivate_wave(self, wave_id: str):
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")
        self.repository.deactivate_wave(wave_id)
        return {"success": True}

    def delete_wave(self, wave_id: str):
        wave = self.repository.get_wave_by_id(wave_id)
        if wave:
            if self.repository.count_applicants_in_wave(wave_id) > 0:
                raise HTTPException(
                    status_code=400,
                    detail="Gelombang memiliki pendaftar dan tidak bisa dihapus",
                )
            self.repository.delete_wave(wave)
        return {"success": True}

    # -------------------------------------------------------------------------
    # Wave fee items (Biaya Tahap 2 per gelombang)
    # -------------------------------------------------------------------------
    def get_wave_fee_items(self, wave_id: str) -> dict[str, Any]:
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")
        items = self.repository.get_fee_items_by_wave(wave_id)
        item_data = []
        for item in items:
            serialized = {c.name: getattr(item, c.name) for c in item.__table__.columns}
            serialized["has_bills"] = (
                self.repository.count_bills_for_fee_item(item.id) > 0
            )
            item_data.append(serialized)
        return {
            "items": item_data,
        }

    def create_wave_fee_item(self, wave_id: str, body: WaveFeeItemCreate):
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")
        if body.discount_scope == "first_x" and not wave.early_discount_quota:
            raise HTTPException(
                status_code=400,
                detail="Kuota diskon pendaftar awal belum diatur pada gelombang ini",
            )
        item = PPDBWaveFeeItem(
            id=str(uuid.uuid4()),
            wave_id=wave_id,
            name=body.name,
            nominal=body.nominal,
            order_index=body.order_index,
            discount_type=body.discount_type,
            discount_value=body.discount_value,
            discount_scope=body.discount_scope,
            created_at=datetime.now(WIB),
            updated_at=datetime.now(WIB),
        )
        self.repository.create_fee_item(item)
        return {c.name: getattr(item, c.name) for c in item.__table__.columns}

    def update_wave_fee_item(self, wave_id: str, item_id: str, body: WaveFeeItemUpdate):
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")
        if body.discount_scope == "first_x" and not wave.early_discount_quota:
            raise HTTPException(
                status_code=400,
                detail="Kuota diskon pendaftar awal belum diatur pada gelombang ini",
            )
        item = self.repository.get_fee_item(item_id)
        if not item or item.wave_id != wave_id:
            raise HTTPException(status_code=404, detail="Item biaya tidak ditemukan")
        if self.repository.count_bills_for_fee_item(item_id) > 0:
            raise HTTPException(
                status_code=400,
                detail="Item biaya sudah memiliki tagihan dan tidak bisa diubah",
            )
        item.name = body.name
        item.nominal = body.nominal
        item.order_index = body.order_index
        item.discount_type = body.discount_type
        item.discount_value = body.discount_value
        item.discount_scope = body.discount_scope
        item.updated_at = datetime.now(WIB)
        self.repository.update_fee_item(item)
        return {c.name: getattr(item, c.name) for c in item.__table__.columns}

    def delete_wave_fee_item(self, wave_id: str, item_id: str):
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")
        item = self.repository.get_fee_item(item_id)
        if not item or item.wave_id != wave_id:
            raise HTTPException(status_code=404, detail="Item biaya tidak ditemukan")
        if (
            self.repository.count_discounts_for_fee_item(item_id) > 0
            or self.repository.count_bills_for_fee_item(item_id) > 0
        ):
            raise HTTPException(
                status_code=400,
                detail="Item biaya sudah dipakai diskon/tagihan dan tidak bisa dihapus",
            )
        self.repository.delete_fee_item(item)
        return {"success": True}

    def update_wave_mou_template(
        self, wave_id: str, body: WaveMouTemplateUpdate
    ) -> dict[str, Any]:
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")
        wave.mou_template = body.mou_template
        wave.updated_at = datetime.now(WIB)
        self.repository.update_wave(wave)
        return {c.name: getattr(wave, c.name) for c in wave.__table__.columns}

    # -------------------------------------------------------------------------
    # Registration
    # -------------------------------------------------------------------------
    def generate_random_password(self, length: int = 8) -> str:
        return "".join(
            random.choice(string.ascii_letters + string.digits) for _ in range(length)
        )

    def generate_unique_username(self, full_name: str) -> str:
        base = (
            "".join(c for c in full_name.split(" ")[0].lower() if c.isalnum()) or "user"
        )
        for _ in range(10):
            candidate = (
                f"{base}{''.join(random.choice(string.digits) for _ in range(4))}"
            )
            if not self.repository.get_user_by_username(candidate):
                return candidate
        return f"{base}{uuid.uuid4().hex[:8]}"

    def register_applicant(self, body: ApplicantRegister) -> dict[str, Any]:
        wave = self.repository.get_active_wave()
        if not wave:
            raise HTTPException(
                status_code=400,
                detail="Pendaftaran saat ini sedang ditutup atau belum dibuka.",
            )

        period = self.repository.get_period_by_id(wave.period_id)
        if not period or period.status != "active":
            raise HTTPException(
                status_code=400,
                detail="Periode pendaftaran belum aktif.",
            )

        today = datetime.now(WIB).date()
        if not wave.registration_start_date or not wave.registration_end_date:
            raise HTTPException(
                status_code=400,
                detail="Jadwal pendaftaran gelombang belum lengkap.",
            )
        if today < wave.registration_start_date:
            raise HTTPException(
                status_code=400,
                detail="Pendaftaran gelombang ini belum dibuka.",
            )
        if today > wave.registration_end_date:
            raise HTTPException(
                status_code=400,
                detail="Pendaftaran gelombang ini sudah ditutup.",
            )
        paid_count = self.repository.count_paid_form_payments_in_wave(wave.id)
        if wave.quota <= 0 or paid_count >= wave.quota:
            raise HTTPException(
                status_code=400,
                detail="Kuota pendaftaran gelombang ini sudah penuh.",
            )

        allowed_paths = [
            p.strip() for p in (wave.allowed_paths or "").split(",") if p.strip()
        ]
        allowed_levels = [
            lvl.strip() for lvl in (wave.allowed_levels or "").split(",") if lvl.strip()
        ]

        if body.registration_path not in allowed_paths:
            raise HTTPException(
                status_code=400,
                detail=f"Jalur pendaftaran '{body.registration_path}' "
                "tidak dibuka pada gelombang ini.",
            )

        level_key = body.registration_level.split(" ")[0]
        if level_key not in allowed_levels:
            raise HTTPException(
                status_code=400,
                detail=f"Jenjang '{level_key}' tidak dibuka pada gelombang ini.",
            )

        if self.repository.get_applicant_by_email_active(body.email):
            raise HTTPException(
                status_code=400,
                detail="Email sudah terdaftar. Silakan login atau gunakan email lain.",
            )

        if self.repository.get_user_by_email(body.email):
            raise HTTPException(
                status_code=400,
                detail="Email sudah terdaftar. "
                "Hubungi panitia jika ingin mendaftar ulang.",
            )

        raw_password = self.generate_random_password()
        username = self.generate_unique_username(body.full_name)
        role_id = self.repository.get_role_id_by_name("Pendaftar")

        now = datetime.now(WIB)
        payment_deadline_wib = datetime.now(ZoneInfo("Asia/Jakarta")) + timedelta(
            days=7
        )
        payment_deadline = payment_deadline_wib.replace(tzinfo=None)

        user = User(
            id=str(uuid.uuid4()),
            username=username,
            password_hash=hash_password(raw_password),
            email=body.email,
            full_name=body.full_name,
            user_type="applicant",
            role_id=role_id,
            created_at=now,
            updated_at=now,
        )

        applicant = PPDBApplicant(
            id=f"applicant-{uuid.uuid4()}",
            wave_id=wave.id,
            user_id=user.id,
            full_name=body.full_name,
            email=body.email,
            phone=body.phone,
            registration_path=body.registration_path,
            registration_level=body.registration_level,
            address=body.address,
            province=body.province,
            city=body.city,
            district=body.district,
            village=body.village,
            postal_code=body.postal_code,
            gender=body.gender,
            birth_place=body.birth_place,
            birth_date=body.birth_date,
            nisn=body.nisn,
            nik=body.nik,
            parent_name=body.parent_name,
            previous_school=body.previous_school,
            major_choice=body.major_choice,
            status="pending_payment",
            payment_status="pending",
            payment_deadline=payment_deadline,
            created_at=now,
            updated_at=now,
        )

        transaction = PPDBPaymentTransaction(
            id=f"pay-{uuid.uuid4()}",
            applicant_id=applicant.id,
            method="offline",
            amount=wave.registration_fee or 0,
            status="pending",
            created_at=now,
            updated_at=now,
        )

        try:
            user, applicant = self.repository.create_user_and_applicant(
                user, applicant, transaction
            )
        except IntegrityError:
            logger.exception(
                "Duplicate on register: email=%s username=%s", body.email, username
            )
            raise HTTPException(
                status_code=400,
                detail="Email sudah terdaftar. Silakan login atau gunakan email lain.",
            )

        from src.core.config import settings

        try:
            # Kirim dua event: spec baru (registration_account_created) dan
            # legacy (registration_welcome) — keduanya aktif selama transisi.
            wave_end = wave.end_date
            tanggal_tutup = (
                wave_end.strftime("%d %B %Y") if wave_end else "sesuai jadwal"
            )
            send_notifications(
                [
                    (
                        "registration_account_created",
                        {
                            "username": user.username,
                            "nama_peserta": user.full_name,
                            "password": raw_password,
                            "nama_sekolah": "Pesantren Ar-Rahman",
                            "link_login": f"{settings.ppdb_frontend_url}/auth/login",
                            "tanggal_tutup_gelombang": tanggal_tutup,
                        },
                    ),
                ],
                user.id,
                user_row={
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "full_name": user.full_name,
                },
                applicant_row={"id": applicant.id, "full_name": applicant.full_name},
            )
        except Exception:
            logger.exception("send_notifications failed after registration; continuing")

        return {
            "success": True,
            "message": "Pendaftaran berhasil",
            "applicant_id": applicant.id,
            "credentials": {"username": username, "password": raw_password},
        }

    # -------------------------------------------------------------------------
    # Applicants & Dashboard
    # -------------------------------------------------------------------------
    def get_applicants(
        self,
        page: int,
        per_page: int,
        search: str,
        wave_id: str | None,
        status: str | None,
        period_id: str | None = None,
        payment_status: str | None = None,
    ):
        """Daftar pendaftar.

        Default: SEMUA pendaftar dari seluruh periode & gelombang (dipakai
        Superadmin). Setiap baris membawa ``period_name`` + ``wave_name`` sebagai
        label asal. Filter ``period_id``/``wave_id`` bersifat opsional untuk
        mempersempit tampilan.

        ``wave_id = "active"`` mempertahankan perilaku lama (hanya gelombang
        aktif) untuk halaman admin PPDB yang memang operasional per gelombang.
        """
        resolved_wave_id = wave_id
        if wave_id == "active":
            active_wave = self.repository.get_active_wave()
            resolved_wave_id = active_wave.id if active_wave else "__none__"

        data, total = self.repository.get_applicants_paginated(
            resolved_wave_id,
            search,
            status,
            page,
            per_page,
            period_id=period_id,
            payment_status=payment_status,
        )

        active_wave = self.repository.get_active_wave()
        active_wave_info = (
            {"id": active_wave.id, "name": active_wave.name} if active_wave else None
        )
        return {
            "data": data,
            "total": total,
            "active_wave": active_wave_info,
            "scope": {
                "wave_id": resolved_wave_id if resolved_wave_id != "__none__" else None,
                "period_id": period_id,
            },
        }

    def get_applicant(self, applicant_id: str) -> dict[str, Any]:
        detail = self.repository.get_applicant_detail(applicant_id)
        if not detail:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
        return detail

    def create_applicant(self, body: ApplicantAdminCreate) -> dict[str, Any]:
        """Buat pendaftar dari Superadmin (CRUD).

        Konsep password tetap sama seperti pendaftaran publik: username & password
        dibuat otomatis oleh sistem, tidak bisa ditentukan admin dan tidak pernah
        bisa dibaca ulang. Password hanya dikembalikan SEKALI di respons ini lalu
        dikirim via WhatsApp. Untuk mengganti password, pakai
        ``reset_applicant_password``.
        """
        wave = self.repository.get_wave_by_id(body.wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")

        if self.repository.get_applicant_by_email_active(body.email):
            raise HTTPException(
                status_code=400, detail="Email sudah terdaftar pada pendaftar lain."
            )
        if self.repository.get_user_by_email(body.email):
            raise HTTPException(
                status_code=400, detail="Email sudah dipakai akun lain."
            )

        raw_password = self.generate_random_password()
        from src.core.security import validate_password

        validate_password(raw_password)

        username = self.generate_unique_username(body.full_name)
        role_id = self.repository.get_role_id_by_name("Pendaftar")

        now = datetime.now(WIB)
        payment_deadline = datetime.now(ZoneInfo("Asia/Jakarta")).replace(
            tzinfo=None
        ) + timedelta(days=7)

        user = User(
            id=str(uuid.uuid4()),
            username=username,
            password_hash=hash_password(raw_password),
            email=body.email,
            full_name=body.full_name,
            user_type="applicant",
            role_id=role_id,
            created_at=now,
            updated_at=now,
        )

        applicant = PPDBApplicant(
            id=f"applicant-{uuid.uuid4()}",
            wave_id=wave.id,
            user_id=user.id,
            full_name=body.full_name,
            email=body.email,
            phone=body.phone,
            registration_path=body.registration_path,
            registration_level=body.registration_level,
            address=body.address,
            province=body.province,
            city=body.city,
            district=body.district,
            village=body.village,
            postal_code=body.postal_code,
            gender=body.gender,
            birth_place=body.birth_place,
            birth_date=body.birth_date,
            nisn=body.nisn,
            nik=body.nik,
            parent_name=body.parent_name,
            previous_school=body.previous_school,
            major_choice=body.major_choice,
            status="pending_payment",
            payment_status="pending",
            payment_deadline=payment_deadline,
            created_at=now,
            updated_at=now,
        )

        transaction = PPDBPaymentTransaction(
            id=f"pay-{uuid.uuid4()}",
            applicant_id=applicant.id,
            method="offline",
            amount=wave.registration_fee or 0,
            status="pending",
            created_at=now,
            updated_at=now,
        )

        try:
            self.repository.create_user_and_applicant(user, applicant, transaction)
        except IntegrityError:
            logger.exception(
                "Duplicate on admin create: email=%s username=%s", body.email, username
            )
            raise HTTPException(
                status_code=400, detail="Email sudah terdaftar. Gunakan email lain."
            )

        self._notify_credentials(user, applicant, raw_password)

        return {
            "success": True,
            "message": "Pendaftar berhasil dibuat",
            "applicant_id": applicant.id,
            "credentials": {"username": username, "password": raw_password},
        }

    def update_applicant(
        self, applicant_id: str, body: ApplicantAdminUpdate
    ) -> dict[str, Any]:
        """Update data pendaftar dari Superadmin.

        Password TIDAK bisa diubah lewat sini — tetap memakai
        ``reset_applicant_password`` supaya konsep kredensial tidak berubah.
        """
        applicant = self.repository.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        data = body.model_dump(exclude_unset=True)
        if not data:
            return {
                "success": True,
                "message": "Tidak ada perubahan",
                "applicant": self.get_applicant(applicant_id),
            }

        wave_id = data.pop("wave_id", None)
        if wave_id:
            wave = self.repository.get_wave_by_id(wave_id)
            if not wave:
                raise HTTPException(
                    status_code=404, detail="Gelombang tujuan tidak ditemukan"
                )
            applicant.wave_id = wave.id

        email = data.get("email")
        if email and email.lower() != (applicant.email or "").lower():
            clash = self.repository.get_applicant_by_email_active(email)
            if clash and clash.id != applicant.id:
                raise HTTPException(
                    status_code=400,
                    detail="Email sudah dipakai pendaftar lain.",
                )
            if self.repository.get_user_by_email(email):
                raise HTTPException(
                    status_code=400, detail="Email sudah dipakai akun lain."
                )
            # Email akun login ikut disesuaikan agar tetap sinkron.
            if applicant.user_id:
                user = self.repository.get_user_by_id(applicant.user_id)
                if user:
                    user.email = email
                    user.updated_at = datetime.now(WIB)

        full_name = data.get("full_name")
        if full_name and applicant.user_id:
            user = self.repository.get_user_by_id(applicant.user_id)
            if user:
                user.full_name = full_name
                user.updated_at = datetime.now(WIB)

        for key, value in data.items():
            if hasattr(applicant, key):
                setattr(applicant, key, value)

        applicant.updated_at = datetime.now(WIB)
        self.repository.update_applicant(applicant)

        return {
            "success": True,
            "message": "Data pendaftar berhasil diperbarui",
            "applicant": self.get_applicant(applicant_id),
        }

    def delete_applicant(self, applicant_id: str) -> dict[str, Any]:
        """Hapus permanen pendaftar + akun login + seluruh data turunannya."""
        applicant = self.repository.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        full_name = applicant.full_name
        # Kumpulkan path berkas SEBELUM baris DB dihapus.
        files = self.repository.get_applicant_document_files(applicant_id)
        self.repository.delete_applicant_permanent(applicant)

        # Berkas fisik dihapus setelah transaksi DB selesai. `delete_upload`
        # sudah menangani local / cloudinary / db:// beserta error-nya.
        from src.core.uploads import delete_upload

        for storage_path in files:
            delete_upload(storage_path)

        logger.info(
            "Applicant permanently deleted: id=%s name=%s files_purged=%d",
            applicant_id,
            full_name,
            len(files),
        )
        return {
            "success": True,
            "message": f"Pendaftar {full_name} beserta seluruh datanya dihapus permanen.",
        }

    def _notify_credentials(
        self, user: User, applicant: PPDBApplicant, raw_password: str
    ) -> None:
        """Kirim kredensial via WhatsApp setelah pendaftar dibuat oleh admin."""
        from src.core.config import settings

        try:
            wave = (
                self.repository.get_wave_by_id(applicant.wave_id)
                if applicant.wave_id
                else None
            )
            tanggal_tutup = (
                wave.end_date.strftime("%d %B %Y")
                if wave and wave.end_date
                else "sesuai jadwal"
            )
            send_notifications(
                [
                    (
                        "registration_account_created",
                        {
                            "username": user.username,
                            "nama_peserta": user.full_name,
                            "password": raw_password,
                            "nama_sekolah": "Pesantren Ar-Rahman",
                            "link_login": f"{settings.ppdb_frontend_url}/auth/login",
                            "tanggal_tutup_gelombang": tanggal_tutup,
                        },
                    ),
                ],
                user.id,
                user_row={
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "full_name": user.full_name,
                },
                applicant_row={
                    "id": applicant.id,
                    "full_name": applicant.full_name,
                    "phone": applicant.phone,
                },
            )
        except Exception:
            logger.exception("send_notifications failed after create; continuing")

    def reset_applicant_password(
        self, applicant_id: str, new_password: str
    ) -> dict[str, Any]:
        applicant = self.repository.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        if not applicant.user_id:
            raise HTTPException(
                status_code=400, detail="Akun login pendaftar tidak ditemukan"
            )

        new_password = (new_password or "").strip()
        if not new_password:
            return {"changed": False, "message": "Password tidak diubah (field kosong)"}

        from src.core.security import validate_password

        validate_password(new_password)

        user = self.repository.get_user_by_id(applicant.user_id)
        if not user:
            raise HTTPException(
                status_code=400, detail="Akun login pendaftar tidak ditemukan"
            )

        self.repository.update_user_password(user, hash_password(new_password))

        from src.core.config import settings

        try:
            send_notifications(
                [
                    (
                        "password_reset",
                        {
                            "password": new_password,
                            "link_login": f"{settings.ppdb_frontend_url}/auth/login",
                        },
                    )
                ],
                user.id,
                user_row={
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "full_name": user.full_name,
                },
                applicant_row={
                    "id": applicant.id,
                    "full_name": applicant.full_name,
                    # Sama seperti create: nomor WA wajib disertakan agar
                    # notifikasi password_reset benar-benar terkirim.
                    "phone": applicant.phone,
                },
            )
        except Exception:
            logger.exception("send password_reset notification failed; continuing")

        return {
            "changed": True,
            "message": "Password berhasil direset",
            "username": user.username,
            "password": new_password,
        }

    # -------------------------------------------------------------------------
    # Dokumen Pendaftar
    # -------------------------------------------------------------------------
    def _get_current_applicant(self, user: dict[str, Any]) -> PPDBApplicant:
        applicant = self.repository.get_applicant_by_user_id(user["id"])
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Data pendaftaran tidak ditemukan"
            )
        return applicant

    def get_my_documents(self, user_id: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Data pendaftaran tidak ditemukan"
            )
        return {"data": self.repository.get_applicant_documents(applicant.id)}

    async def upload_document(
        self, user: dict[str, Any], doc_type: str, file: UploadFile
    ) -> dict[str, Any]:
        import uuid

        from src.core.uploads import delete_upload, upload_file

        applicant = self._get_current_applicant(user)
        if applicant.status not in _DOCUMENT_UPLOAD_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Dokumen sedang dalam proses verifikasi, tidak dapat diunggah",
            )

        doc_type = (doc_type or "").strip()
        if doc_type not in REQUIRED_DOCUMENTS:
            raise HTTPException(status_code=400, detail="Jenis dokumen tidak dikenal")

        file_id = str(uuid.uuid4())
        upload = await upload_file(file, file_id)
        old_paths = self.repository.replace_applicant_document(
            applicant_id=applicant.id,
            doc_type=doc_type,
            upload=upload,
            file_id=file_id,
            uploaded_by=user["id"],
            now=datetime.now(WIB),
        )
        for path in old_paths:
            delete_upload(path)

        docs = self.repository.get_applicant_documents(applicant.id)
        document = next((d for d in docs if d["doc_type"] == doc_type), None)
        return {"message": "Dokumen berhasil diunggah", "document": document}

    def submit_documents(self, user: dict[str, Any]) -> dict[str, Any]:
        applicant = self._get_current_applicant(user)
        if applicant.status not in _DOCUMENT_UPLOAD_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Dokumen sedang dalam proses verifikasi",
            )

        docs = self.repository.get_applicant_documents(applicant.id)
        uploaded_types = {d["doc_type"] for d in docs}
        missing = [name for name in REQUIRED_DOCUMENTS if name not in uploaded_types]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Lengkapi semua dokumen dahulu. Kurang: {len(missing)} dokumen",
            )

        applicant.status = "document_uploaded"
        applicant.updated_at = datetime.now(WIB)
        self.repository.update_applicant(applicant)

        return {
            "status": "document_uploaded",
            "message": "Dokumen dikirim untuk verifikasi",
        }

    def get_applicant_documents_admin(self, applicant_id: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
        return {"data": self.repository.get_applicant_documents(applicant.id)}

    def verify_applicant_documents(
        self, applicant_id: str, status: str, rejection_reason: str | None
    ) -> dict[str, Any]:
        from src.core.config import settings

        applicant = self.repository.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        if status not in ("document_approved", "document_rejected"):
            raise HTTPException(status_code=400, detail="Status verifikasi tidak valid")
        if status == "document_rejected" and not (rejection_reason or "").strip():
            raise HTTPException(status_code=400, detail="Alasan penolakan wajib diisi")

        applicant.status = status
        applicant.rejection_reason = (
            rejection_reason.strip() if rejection_reason else None
        )
        applicant.updated_at = datetime.now(WIB)
        self.repository.update_applicant(applicant)

        try:
            if status == "document_rejected":
                # Spec baru: document_rejected_revision
                send_notification(
                    "document_rejected_revision",
                    applicant.user_id,
                    {
                        "alasan_penolakan": applicant.rejection_reason or "",
                        "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                    },
                )
            elif status == "document_approved":
                # Cek jalur pendaftaran: TIU → instruksi SEB, lainnya → pilih jadwal Tahfidz
                is_tiu = (
                    getattr(applicant, "registration_path", "") or ""
                ).lower() == "tiu"
                if is_tiu:
                    send_notification(
                        "tiu_exam_instructions",
                        applicant.user_id,
                        {
                            "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                            "link_panduan_seb": f"{settings.ppdb_frontend_url}/panduan-seb",
                        },
                    )
                else:
                    send_notification(
                        "document_approved_non_tiu",
                        applicant.user_id,
                        {
                            "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                        },
                    )
        except Exception:
            logger.exception("send document notification failed; continuing")

        return {
            "status": status,
            "full_name": applicant.full_name,
            "message": (
                "Dokumen disetujui"
                if status == "document_approved"
                else "Dokumen ditolak"
            ),
        }

    def get_dashboard_stats(self) -> dict[str, Any]:
        active_wave = self.repository.get_active_wave()
        active_period_name = self.repository.get_active_period_name()

        if not active_wave:
            return {
                "active_wave": None,
                "active_period_name": active_period_name,
                "applicants": {
                    "total": 0,
                    "document_uploaded": 0,
                    "document_uploaded_pending": 0,
                    "document_rejected": 0,
                    "selection": 0,
                    "passed": 0,
                    "failed": 0,
                    "expired": 0,
                },
                "payments": {
                    "pending": 0,
                    "success": 0,
                    "failed": 0,
                    "expired": 0,
                    "cancelled": 0,
                    "by_method": {},
                },
                "trend": [],
            }

        grouped = self.repository.count_applicants_by_status_in_wave(active_wave.id)

        def g(key: str) -> int:
            return grouped.get(key, 0)

        payments_by_status = self.repository.count_payments_by_status_in_wave(
            active_wave.id
        )

        def p(key: str) -> int:
            return payments_by_status.get(key, 0)

        return {
            "active_wave": {"id": active_wave.id, "name": active_wave.name},
            "active_period_name": active_period_name,
            "applicants": {
                "total": self.repository.count_applicants_in_wave(active_wave.id),
                "document_uploaded": g("document_uploaded"),
                "document_uploaded_pending": g("document_uploaded_pending"),
                "document_rejected": g("document_rejected"),
                "selection": g("selection"),
                "passed": g("passed"),
                "failed": g("failed"),
                "expired": g("expired"),
            },
            "payments": {
                "pending": p("pending"),
                "success": p("success"),
                "failed": p("failed"),
                "expired": p("expired"),
                "cancelled": p("cancelled"),
                "by_method": self.repository.count_payments_by_method_in_wave(
                    active_wave.id
                ),
            },
            "trend": self.repository.get_registration_trend(active_wave.id),
        }

    def soft_delete_expired_applicants(self) -> dict[str, Any]:
        now = datetime.now(ZoneInfo("Asia/Jakarta"))
        now_str = now.strftime("%Y-%m-%d %H:%M:%S")

        applicants = self.repository.get_expired_pending_applicants(now_str)
        if not applicants:
            return {"deleted": 0}

        self.repository.soft_delete_applicants(applicants, now_str)

        # payment_expired: tidak ada padanan di spec baru, tetap dikirim
        # karena user perlu tahu akun mereka kedaluwarsa.
        for app in applicants:
            send_notifications([("payment_expired", {})], app.user_id)

        return {"deleted": len(applicants), "applicant_ids": [a.id for a in applicants]}

    def run_reminders(self) -> dict[str, Any]:
        """
        Cron harian — digantikan oleh endpoint-endpoint baru:
          - payment_reminder_monday  → POST /notifications/cron/payment-reminder-monday
          - reminder_upload_docs_h3  → belum ada cron khusus, TODO
          - reminder_exam_1hour      → belum ada cron khusus, TODO
          - selection_reminder_*     → dihapus, tidak ada padanan di spec baru

        Fungsi ini dipertahankan agar endpoint cron lama tidak error 500,
        tapi tidak mengirim notifikasi apapun lagi — semua sudah dipindah ke
        endpoint baru yang lebih granular.
        """
        return {
            "success": True,
            "migrated": True,
            "message": "Reminder system migrated to new endpoints",
        }

    # -------------------------------------------------------------------------
    # MOU
    # -------------------------------------------------------------------------
    def get_applicant_mou(self, applicant_id: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        mou = self.repository.get_mou_by_applicant(applicant_id)
        if not mou:
            return {"mou": None}

        return {"mou": self._mou_to_dict(mou)}

    @staticmethod
    def _mou_to_dict(mou: PPDBBMOU) -> dict[str, Any]:
        return {
            "id": mou.id,
            "applicant_id": mou.applicant_id,
            "draft_content": mou.draft_content,
            "signature_data": mou.signature_data,
            "status": mou.status,
            "signed_at": mou.signed_at.isoformat() if mou.signed_at else None,
            "created_at": mou.created_at.isoformat() if mou.created_at else None,
            "updated_at": mou.updated_at.isoformat() if mou.updated_at else None,
        }

    def get_my_mou(self, user_id: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Data pendaftaran tidak ditemukan"
            )
        mou = self.repository.get_mou_by_applicant(applicant.id)
        if not mou:
            return {"mou": None}
        return {"mou": self._mou_to_dict(mou)}

    def sign_my_mou(self, user_id: str, body: MouSignRequest) -> dict[str, Any]:
        applicant = self.repository.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Data pendaftaran tidak ditemukan"
            )
        mou = self.repository.get_mou_by_applicant(applicant.id)
        if not mou:
            raise HTTPException(status_code=404, detail="MOU belum tersedia")
        if mou.status == "signed":
            return {"success": True, "message": "MOU sudah ditandatangani"}
        if not body.signature_data or not body.signature_data.strip():
            raise HTTPException(status_code=400, detail="Data tanda tangan wajib diisi")
        mou.signature_data = body.signature_data
        mou.status = "signed"
        mou.signed_at = datetime.now(WIB)
        mou.updated_at = datetime.now(WIB)
        self.repository.update_mou(mou)
        return {"success": True, "message": "MOU berhasil ditandatangani"}
