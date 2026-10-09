import json
import logging
import os
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
    PPDBApplicant,
    PPDBPaymentTransaction,
    PPDBPeriod,
    PPDBStage2Bill,
    PPDBWave,
    PPDBWaveFeeItem,
)
from src.modules.ppdb.schemas import (
    ApplicantAdminCreate,
    ApplicantAdminUpdate,
    ApplicantRegister,
    PeriodCreate,
    PeriodUpdate,
    WaveCreate,
    WaveFeeItemCreate,
    WaveFeeItemUpdate,
    WaveUpdate,
)
from src.repositories.ppdb_repository import PPDBRepository

WIB = ZoneInfo("Asia/Jakarta")

logger = logging.getLogger("ptdarrahman.ppdb")

BASE_DOCUMENTS = [
    {
        "name": "NISN",
        "description": "Kartu atau bukti cetak NISN resmi.",
        "required": True,
        "category": "wajib",
    },
    {
        "name": "Kartu Keluarga (KK)",
        "description": "Bukti susunan keluarga dan NIK.",
        "required": True,
        "category": "wajib",
    },
    {
        "name": "Akta Kelahiran",
        "description": "Bukti kelahiran calon santri/siswa.",
        "required": True,
        "category": "wajib",
    },
    {
        "name": "Pas Foto",
        "description": "Pas foto terbaru calon siswa (3x4 atau 4x6).",
        "required": True,
        "category": "wajib",
    },
]

TIU_DOCUMENTS = [d["name"] for d in BASE_DOCUMENTS]

NON_TIU_DOCUMENTS = TIU_DOCUMENTS + ["Dokumen Pendukung Jalur"]


def is_tiu_path(path: str | None) -> bool:
    p = (path or "").strip().lower()
    return "tiu" in p or p in ("reguler", "tes")


def get_path_document_specs(path: str | None) -> list[dict[str, Any]]:
    p = (path or "").strip().lower()
    docs = [dict(d) for d in BASE_DOCUMENTS]
    if is_tiu_path(p):
        return docs
    elif "prestasi" in p:
        # Minimal 3 sertifikat prestasi, maksimal 10
        docs.extend(
            [
                {
                    "name": "Sertifikat Prestasi 1",
                    "description": (
                        "Sertifikat / Piagam Kejuaraan / Prestasi (Wajib ke-1)."
                    ),
                    "required": True,
                    "category": "tambahan",
                },
                {
                    "name": "Sertifikat Prestasi 2",
                    "description": (
                        "Sertifikat / Piagam Kejuaraan / Prestasi (Wajib ke-2)."
                    ),
                    "required": True,
                    "category": "tambahan",
                },
                {
                    "name": "Sertifikat Prestasi 3",
                    "description": (
                        "Sertifikat / Piagam Kejuaraan / Prestasi "
                        "(Wajib ke-3, syarat minimal 3 sertifikat)."
                    ),
                    "required": True,
                    "category": "tambahan",
                },
                {
                    "name": "Sertifikat Prestasi 4",
                    "description": "Sertifikat / Piagam Kejuaraan tambahan (Opsional).",
                    "required": False,
                    "category": "tambahan",
                },
                {
                    "name": "Sertifikat Prestasi 5",
                    "description": "Sertifikat / Piagam Kejuaraan tambahan (Opsional).",
                    "required": False,
                    "category": "tambahan",
                },
                {
                    "name": "Sertifikat Prestasi 6",
                    "description": "Sertifikat / Piagam Kejuaraan tambahan (Opsional).",
                    "required": False,
                    "category": "tambahan",
                },
                {
                    "name": "Sertifikat Prestasi 7",
                    "description": "Sertifikat / Piagam Kejuaraan tambahan (Opsional).",
                    "required": False,
                    "category": "tambahan",
                },
                {
                    "name": "Sertifikat Prestasi 8",
                    "description": "Sertifikat / Piagam Kejuaraan tambahan (Opsional).",
                    "required": False,
                    "category": "tambahan",
                },
                {
                    "name": "Sertifikat Prestasi 9",
                    "description": "Sertifikat / Piagam Kejuaraan tambahan (Opsional).",
                    "required": False,
                    "category": "tambahan",
                },
                {
                    "name": "Sertifikat Prestasi 10",
                    "description": "Sertifikat / Piagam Kejuaraan tambahan (Opsional).",
                    "required": False,
                    "category": "tambahan",
                },
            ]
        )
    elif "rapot" in p or "rapor" in p or "pindahan" in p:
        # 4 rapor semester terakhir
        docs.extend(
            [
                {
                    "name": "Rapor Semester 1",
                    "description": (
                        "Scan/foto rapor semester ke-1 dari 4 semester terakhir."
                    ),
                    "required": True,
                    "category": "tambahan",
                },
                {
                    "name": "Rapor Semester 2",
                    "description": (
                        "Scan/foto rapor semester ke-2 dari 4 semester terakhir."
                    ),
                    "required": True,
                    "category": "tambahan",
                },
                {
                    "name": "Rapor Semester 3",
                    "description": (
                        "Scan/foto rapor semester ke-3 dari 4 semester terakhir."
                    ),
                    "required": True,
                    "category": "tambahan",
                },
                {
                    "name": "Rapor Semester 4",
                    "description": (
                        "Scan/foto rapor semester ke-4 dari 4 semester terakhir."
                    ),
                    "required": True,
                    "category": "tambahan",
                },
            ]
        )
    elif "tahfidz" in p:
        # Maksimal 3 bukti hafalan, utamakan surat pengakuan hafalan
        # bukan dokumentasi/video
        docs.extend(
            [
                {
                    "name": "Surat Pengakuan Hafalan 1",
                    "description": (
                        "Surat Keterangan / Piagam Pengakuan Hafalan resmi dari "
                        "lembaga/orang tua (Wajib minimal 1). Utamakan surat "
                        "pengakuan hafalan, bukan file video."
                    ),
                    "required": True,
                    "category": "tambahan",
                },
                {
                    "name": "Surat Pengakuan Hafalan 2",
                    "description": (
                        "Surat Keterangan / Piagam Pengakuan Hafalan tambahan "
                        "(Opsional, max 3)."
                    ),
                    "required": False,
                    "category": "tambahan",
                },
                {
                    "name": "Surat Pengakuan Hafalan 3",
                    "description": (
                        "Surat Keterangan / Piagam Pengakuan Hafalan tambahan "
                        "(Opsional, max 3)."
                    ),
                    "required": False,
                    "category": "tambahan",
                },
            ]
        )
    else:
        docs.append(
            {
                "name": "Dokumen Pendukung Jalur",
                "description": "Dokumen pendukung sesuai jalur yang dipilih.",
                "required": True,
                "category": "tambahan",
            }
        )
    return docs


def get_required_documents(path: str) -> list[str]:
    """Mengembalikan daftar nama dokumen yang WAJIB untuk jalur tersebut."""
    return [d["name"] for d in get_path_document_specs(path) if d.get("required", True)]


def get_all_allowed_documents(path: str) -> list[str]:
    """Mengembalikan semua dokumen (wajib + opsional) yang diizinkan
    untuk jalur tersebut."""
    return [d["name"] for d in get_path_document_specs(path)]


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
            wa_group_link=body.wa_group_link,
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
        if "wa_group_link" in provided:
            period.wa_group_link = provided["wa_group_link"]
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
            "allowed_paths": [
                p.strip() for p in (wave.allowed_paths or "").split(",") if p.strip()
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
            registration_start_date=body.registration_start_date,
            registration_end_date=body.registration_end_date,
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
            "registration_start_date",
            "registration_end_date",
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

    # -------------------------------------------------------------------------
    # Registration
    # -------------------------------------------------------------------------
    def generate_random_password(self, length: int = 8) -> str:
        return "".join(
            random.choice(string.ascii_letters + string.digits) for _ in range(length)
        )

    def _serialize_health_history(self, body: ApplicantRegister) -> str | None:
        health_form = getattr(body, "health_form", None)
        if health_form is not None:
            return str(json.dumps(health_form.model_dump(), ensure_ascii=False))
        if getattr(body, "disease_history", None):
            return str(body.disease_history)
        items = body.disease_history_items or []
        notes = body.disease_history_notes
        if not items and not notes:
            return None
        parts: list[str] = []
        for item in items:
            text = f"{item.question}: {item.answer}"
            if item.notes:
                text += f" ({item.notes})"
            parts.append(text)
        if notes:
            parts.append(f"Catatan tambahan: {notes}")
        return "; ".join(parts)

    def _serialize_health_history_admin(self, body: Any) -> str | None:
        health_form = getattr(body, "health_form", None)
        if health_form is not None:
            return str(json.dumps(health_form.model_dump(), ensure_ascii=False))
        if getattr(body, "disease_history", None):
            return str(body.disease_history)
        items = getattr(body, "disease_history_items", None) or []
        notes = getattr(body, "disease_history_notes", None)
        if not items and not notes:
            return None
        parts: list[str] = []
        for item in items:
            text = f"{item.question}: {item.answer}"
            if getattr(item, "notes", None):
                text += f" ({item.notes})"
            parts.append(text)
        if notes:
            parts.append(f"Catatan tambahan: {notes}")
        return "; ".join(parts)

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
        # Formulir Identifikasi Kesehatan (pengganti Medcheck) wajib diisi
        # pendaftar dan divalidasi ulang di server (lihat HealthIdentificationForm).
        if body.health_form is None:
            raise HTTPException(
                status_code=422,
                detail="Formulir Identifikasi Kesehatan wajib diisi sebelum mendaftar.",
            )

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

        if body.registration_path not in allowed_paths:
            raise HTTPException(
                status_code=400,
                detail=f"Jalur pendaftaran '{body.registration_path}' "
                "tidak dibuka pada gelombang ini.",
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
        # Sesuai aturan bisnis PPDB: Batas akhir pembayaran formulir adalah
        # penutupan pendaftaran gelombang
        if wave.registration_end_date:
            payment_deadline = datetime(
                wave.registration_end_date.year,
                wave.registration_end_date.month,
                wave.registration_end_date.day,
                23,
                59,
                59,
            )
        elif wave.end_date:
            payment_deadline = datetime(
                wave.end_date.year,
                wave.end_date.month,
                wave.end_date.day,
                23,
                59,
                59,
            )
        else:
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
            parent_name=(
                body.parent_name
                or body.father_name
                or body.guardian_name
                or body.mother_name
            ),
            father_name=body.father_name,
            father_job=body.father_job,
            father_phone=body.father_phone,
            mother_name=body.mother_name,
            mother_job=body.mother_job,
            mother_phone=body.mother_phone,
            guardian_name=body.guardian_name,
            guardian_job=body.guardian_job,
            parent_phone=body.parent_phone or body.father_phone or body.mother_phone,
            parent_income=body.parent_income,
            parent_email=body.parent_email,
            previous_school=body.previous_school,
            disease_history=self._serialize_health_history(body),
            status="pending_payment",
            payment_status="pending",
            payment_deadline=payment_deadline,
            created_at=now,
            updated_at=now,
        )

        transaction = PPDBPaymentTransaction(
            id=f"pay-{uuid.uuid4()}",
            applicant_id=applicant.id,
            method="qris",
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
            # legacy (registration_welcome) Ã¢â‚¬â€ keduanya aktif selama transisi.
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
        if wave.registration_end_date:
            payment_deadline = datetime(
                wave.registration_end_date.year,
                wave.registration_end_date.month,
                wave.registration_end_date.day,
                23,
                59,
                59,
            )
        elif wave.end_date:
            payment_deadline = datetime(
                wave.end_date.year,
                wave.end_date.month,
                wave.end_date.day,
                23,
                59,
                59,
            )
        else:
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
            parent_name=(
                body.parent_name
                or body.father_name
                or body.guardian_name
                or body.mother_name
            ),
            father_name=body.father_name,
            father_job=body.father_job,
            father_phone=body.father_phone,
            mother_name=body.mother_name,
            mother_job=body.mother_job,
            mother_phone=body.mother_phone,
            guardian_name=body.guardian_name,
            guardian_job=body.guardian_job,
            parent_phone=body.parent_phone or body.father_phone or body.mother_phone,
            parent_income=body.parent_income,
            parent_email=body.parent_email,
            previous_school=body.previous_school,
            disease_history=self._serialize_health_history_admin(body),
            status="pending_payment",
            payment_status="pending",
            payment_deadline=payment_deadline,
            created_at=now,
            updated_at=now,
        )

        transaction = PPDBPaymentTransaction(
            id=f"pay-{uuid.uuid4()}",
            applicant_id=applicant.id,
            method="qris",
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

        Password TIDAK bisa diubah lewat sini Ã¢â‚¬â€ tetap memakai
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
            "message": (
                f"Pendaftar {full_name} beserta seluruh datanya dihapus permanen."
            ),
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

    def change_my_path(self, user_id: str, new_path: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Data pendaftaran tidak ditemukan"
            )

        # Aturan pendaftar-code: Fitur Ganti Jalur hanya terbuka SEBELUM
        # pendaftar melakukan Upload Dokumen
        existing_docs = self.repository.get_applicant_documents(applicant.id)
        if existing_docs and len(existing_docs) > 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Fitur ganti jalur hanya terbuka sebelum Anda mengunggah dokumen."
                ),
            )

        allowed_statuses = {
            "pending_payment",
            "document_uploaded_pending",
            "document_rejected",
        }
        if applicant.status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail="Tidak dapat mengganti jalur pada status saat ini",
            )

        new_path_clean = (new_path or "").strip().lower()
        if new_path_clean == "pindahan":
            new_path_clean = "rapot"
        if new_path_clean not in ("reguler", "prestasi", "tahfidz", "rapot"):
            raise HTTPException(status_code=400, detail="Jalur pendaftaran tidak valid")

        applicant.registration_path = new_path_clean
        applicant.updated_at = datetime.now(WIB)
        self.repository.update_applicant(applicant)

        return {
            "message": "Jalur pendaftaran berhasil diubah",
            "registration_path": new_path_clean,
        }

    def get_my_documents(self, user_id: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Data pendaftaran tidak ditemukan"
            )
        specs = get_path_document_specs(applicant.registration_path)
        return {
            "data": self.repository.get_applicant_documents(applicant.id),
            "required_documents": specs,
        }

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
        allowed = get_all_allowed_documents(applicant.registration_path)
        if doc_type not in allowed:
            reg_path = applicant.registration_path
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Jenis dokumen '{doc_type}' tidak sesuai untuk jalur {reg_path}"
                ),
            )

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
        mandatory = get_required_documents(applicant.registration_path)
        missing = [name for name in mandatory if name not in uploaded_types]
        if missing:
            reg_path = applicant.registration_path
            missing_list = ", ".join(missing)
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Lengkapi seluruh dokumen wajib untuk jalur {reg_path}. "
                    f"Dokumen belum diunggah: {missing_list}"
                ),
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

        applicant.status = "selection" if status == "document_approved" else status
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
                is_tiu = is_tiu_path(getattr(applicant, "registration_path", ""))
                if is_tiu:
                    send_notification(
                        "tiu_exam_instructions",
                        applicant.user_id,
                        {
                            "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                            "link_panduan_seb": (
                                f"{settings.ppdb_frontend_url}/panduan-seb"
                            ),
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
        Cron harian Ã¢â‚¬â€ digantikan oleh endpoint-endpoint baru:
          - payment_reminder_monday  Ã¢â€ â€™ POST
            /notifications/cron/payment-reminder-monday
          - reminder_upload_docs_h3  Ã¢â€ â€™ belum ada cron khusus, TODO
          - reminder_exam_1hour      Ã¢â€ â€™ belum ada cron khusus, TODO
          - selection_reminder_*     Ã¢â€ â€™ dihapus, tidak ada padanan di spec baru

        Fungsi ini dipertahankan agar endpoint cron lama tidak error 500,
        tapi tidak mengirim notifikasi apapun lagi Ã¢â‚¬â€ semua sudah dipindah ke
        endpoint baru yang lebih granular.
        """
        return {
            "success": True,
            "migrated": True,
            "message": "Reminder system migrated to new endpoints",
        }

    def get_applicant_transcript(self, applicant_id: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_detail(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        from sqlalchemy import select

        from src.models.selection import (
            SelectionCategory,
            SelectionCriteria,
            SelectionResult,
            SelectionScore,
        )

        scores_rows = self.repository.db.execute(
            select(
                SelectionScore.score,
                SelectionCriteria.name.label("criteria_name"),
                SelectionCriteria.weight,
                SelectionCategory.name.label("category_name"),
                SelectionCategory.id.label("category_id"),
            )
            .join(SelectionCriteria, SelectionScore.criteria_id == SelectionCriteria.id)
            .join(
                SelectionCategory, SelectionCriteria.category_id == SelectionCategory.id
            )
            .where(SelectionScore.applicant_id == applicant_id)
            .order_by(SelectionCategory.name.asc(), SelectionCriteria.name.asc())
        ).all()

        categories_map: dict[str, dict[str, Any]] = {}
        for row in scores_rows:
            cat_name = row.category_name
            if cat_name not in categories_map:
                categories_map[cat_name] = {
                    "category_name": cat_name,
                    "criteria": [],
                }
            categories_map[cat_name]["criteria"].append(
                {
                    "criteria_name": row.criteria_name,
                    "weight": row.weight,
                    "score": row.score,
                }
            )

        sel_res = (
            self.repository.db.execute(
                select(SelectionResult).where(
                    SelectionResult.applicant_id == applicant_id
                )
            )
            .scalars()
            .first()
        )

        tiu_completed = applicant.get("tiu_completed_at")
        tiu_isoformat = getattr(tiu_completed, "isoformat", None)
        tiu_completed_str = (
            str(tiu_isoformat())
            if callable(tiu_isoformat)
            else str(tiu_completed)
            if tiu_completed
            else None
        )

        return {
            "applicant": applicant,
            "tiu_score": applicant.get("tiu_score"),
            "tiu_completed_at": tiu_completed_str,
            "categories": list(categories_map.values()),
            "evaluator_notes": sel_res.notes if sel_res else None,
            "graduation_status": sel_res.graduation_status
            if sel_res
            else applicant.get("status"),
            "issued_at": datetime.now(WIB).isoformat(),
        }

    def get_applicant_loa(self, applicant_id: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_detail(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        # LoA dibuat otomatis oleh sistem — tidak ada template yang bisa diedit admin
        template_text = (
            "SURAT PENERIMAAN SANTRI BARU (LETTER OF ACCEPTANCE)\n\n"
            "Dengan hormat,\n"
            "Berdasarkan hasil evaluasi seleksi Penerimaan Peserta Didik "
            "Baru (PPDB), kami menyatakan bahwa:\n\n"
            "Nama Lengkap: {{nama}}\n"
            "Nomor Induk / NISN: {{nisn}}\n"
            "Jalur Pendaftaran: {{jalur}}\n"
            "Gelombang: {{gelombang}}\n\n"
            "Dinyatakan DITERIMA / LULUS sebagai santri baru di "
            "Pesantren Tahfidz Ar-Rahman.\n\n"
            "Harap segera menyelesaikan tahapan administrasi dan "
            "pembayaran Tahap 2 sesuai jadwal yang ditentukan."
        )

        replacements = {
            "{{nama}}": applicant.get("full_name") or "",
            "{{nisn}}": applicant.get("nisn") or applicant.get("nik") or "-",
            "{{no_registrasi}}": applicant.get("nisn")
            or str(applicant.get("id", ""))[:8].upper(),
            "{{jalur}}": str(applicant.get("registration_path") or "").capitalize(),
            "{{jenjang}}": "SMK",
            "{{gelombang}}": str(applicant.get("wave_name") or "-"),
            "{{tanggal}}": datetime.now(WIB).strftime("%d %B %Y"),
        }

        rendered = template_text
        for placeholder, val in replacements.items():
            rendered = rendered.replace(placeholder, val)

        FIXED_LOA_CLAUSE = (
            "Seluruh dana yang telah dibayarkan tidak dapat dikembalikan."
        )

        applicant_ref = str(applicant.get("id", ""))[:8].upper()
        return {
            "letter_number": f"LoA/PPDB/{datetime.now(WIB).year}/{applicant_ref}",
            "applicant": applicant,
            "content": rendered,
            "fixed_clause": FIXED_LOA_CLAUSE,
            "is_graduated": applicant.get("status") == "passed",
            "issued_at": datetime.now(WIB).isoformat(),
        }

    def get_applicant_skd(self, applicant_id: str) -> dict[str, Any]:
        applicant = self.repository.get_applicant_detail(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
        if applicant.get("status") != "passed":
            raise HTTPException(
                status_code=400, detail="Pendaftar belum dinyatakan lulus"
            )
        from src.models.ppdb import PPDBPeriod

        period_id = applicant.get("period_id")
        period = self.repository.db.get(PPDBPeriod, period_id) if period_id else None
        wa_link = period.wa_group_link if period and period.wa_group_link else ""

        applicant_ref = str(applicant.get("id", ""))[:8].upper()
        return {
            "letter_number": f"SKD/PPDB/{datetime.now(WIB).year}/{applicant_ref}",
            "applicant": applicant,
            "background_url": "",
            "whatsapp_group_link": wa_link or "",
            "issued_at": datetime.now(WIB).isoformat(),
        }

    def get_archive_applicants(
        self,
        period_id: str | None,
        wave_id: str | None,
        search: str | None,
        status: str | None,
        page: int,
        per_page: int,
    ) -> dict[str, Any]:
        """Pencarian lintas periode dan gelombang khusus arsip."""
        rows, total = self.repository.get_applicants_paginated(
            wave_id=wave_id,
            search=search or "",
            status=status,
            page=page,
            per_page=per_page,
            period_id=period_id,
            payment_status=None,
        )
        return {
            "data": rows,
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    def get_applicant_dossier(
        self,
        applicant_id: str,
        admin_user: dict[str, Any],
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        applicant = self.repository.get_applicant_detail(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        docs = self.repository.get_applicant_documents(applicant_id)
        transcript = self.get_applicant_transcript(applicant_id)
        loa = self.get_applicant_loa(applicant_id)
        try:
            skd = self.get_applicant_skd(applicant_id)
        except Exception:
            skd = None

        form_payments = (
            self.repository.db.query(PPDBPaymentTransaction)
            .filter(PPDBPaymentTransaction.applicant_id == applicant_id)
            .order_by(PPDBPaymentTransaction.created_at.desc())
            .all()
        )
        stage2_bills = (
            self.repository.db.query(PPDBStage2Bill)
            .filter(PPDBStage2Bill.applicant_id == applicant_id)
            .order_by(PPDBStage2Bill.installment_number.asc())
            .all()
        )

        from src.models.auth import AuditLog

        dossier_full_name = applicant.get("full_name")
        audit = AuditLog(
            id=str(uuid.uuid4()),
            user_id=admin_user.get("id"),
            user_username=admin_user.get("username"),
            action="view_dossier",
            entity_type="ppdb_dossier",
            entity_id=applicant_id,
            changes=(f"Melihat dossier pendaftar {dossier_full_name} ({applicant_id})"),
            ip_address=ip_address,
            created_at=datetime.now(WIB),
        )
        self.repository.db.add(audit)
        self.repository.db.commit()

        raw_health = applicant.get("disease_history") or ""
        if raw_health.startswith("{"):
            try:
                applicant["health_profile"] = json.loads(raw_health)
            except Exception:
                applicant["health_profile"] = None
        else:
            applicant["health_profile"] = None

        return {
            "applicant": applicant,
            "documents": docs,
            "transcript": transcript,
            "loa": loa,
            "skd": skd,
            "payments": {
                "form_payments": [
                    {
                        "id": p.id,
                        "invoice_number": p.invoice_number,
                        "amount": p.amount,
                        "status": p.status,
                        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                        "payment_method": p.payment_method,
                    }
                    for p in form_payments
                ],
                "stage2_bills": [
                    {
                        "id": b.id,
                        "installment_number": b.installment_number,
                        "amount": b.amount,
                        "status": b.status,
                        "due_date": b.due_date.isoformat() if b.due_date else None,
                        "confirmed_at": b.confirmed_at.isoformat()
                        if b.confirmed_at
                        else None,
                    }
                    for b in stage2_bills
                ],
            },
            "accessed_at": datetime.now(WIB).isoformat(),
        }

    def export_applicant_dossier_zip(
        self,
        applicant_id: str,
        admin_user: dict[str, Any],
        ip_address: str | None = None,
    ) -> tuple[bytes, str]:
        dossier = self.get_applicant_dossier(applicant_id, admin_user, ip_address)
        applicant = dossier["applicant"]

        import io
        import json
        import zipfile

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            summary_json = json.dumps(dossier, indent=2, default=str)
            zf.writestr("ringkasan_dossier.json", summary_json)

            raw_health = applicant.get("disease_history") or ""
            health_lines = [
                "FORMULIR IDENTIFIKASI KESEHATAN (PENGGANTI MEDCHECK)",
                "Pesantren Tahfidz Ar-Rahman",
                "----------------------------------------",
                f"Nama Pendaftar: {applicant.get('full_name')}",
                f"NISN: {applicant.get('nisn') or '-'}",
                f"Waktu Pendaftaran: {applicant.get('created_at') or '-'}",
                "----------------------------------------",
            ]
            if raw_health.startswith("{"):
                try:
                    hdata = json.loads(raw_health)
                    chronic_txt = "Tidak"
                    if hdata.get("chronic_disease"):
                        chronic_desc = hdata.get("chronic_disease_description") or ""
                        chronic_txt = f"Ya ({chronic_desc})"
                    health_lines.append(f"1. Riwayat Penyakit Kronis: {chronic_txt}")
                    conds = ", ".join(hdata.get("diagnosed_conditions") or [])
                    if hdata.get("diagnosed_conditions_other"):
                        conds += (
                            f" (Lainnya: {hdata.get('diagnosed_conditions_other')})"
                        )
                    if hdata.get("diagnosed_conditions_description"):
                        cond_desc = hdata.get("diagnosed_conditions_description")
                        conds += f" - Keterangan: {cond_desc}"
                    health_lines.append(
                        f"2. Kondisi yang Pernah Didiagnosis: {conds or 'Tidak ada'}"
                    )

                    allergies_txt = "Tidak"
                    if hdata.get("allergies"):
                        atypes = ", ".join(hdata.get("allergy_types") or [])
                        if hdata.get("allergy_other"):
                            atypes += f" (Lainnya: {hdata.get('allergy_other')})"
                        if hdata.get("allergy_description"):
                            atypes += (
                                f" - Keterangan: {hdata.get('allergy_description')}"
                            )
                        allergies_txt = f"Ya ({atypes})"
                    health_lines.append(f"3. Alergi: {allergies_txt}")

                    med_txt = "Tidak"
                    if hdata.get("regular_medication"):
                        med_desc = hdata.get("regular_medication_description") or ""
                        med_txt = f"Ya ({med_desc})"
                    health_lines.append(
                        f"4. Sedang Menjalani Pengobatan Rutin: {med_txt}"
                    )
                    physical_txt = "Tidak"
                    if hdata.get("physical_limitation"):
                        limit_desc = hdata.get("physical_limitation_description") or ""
                        physical_txt = f"Ya ({limit_desc})"
                    health_lines.append(
                        f"5. Kondisi Kesehatan / Keterbatasan Fisik: {physical_txt}"
                    )
                    hosp_txt = "Tidak"
                    if hdata.get("hospitalization_history"):
                        hosp_desc = (
                            hdata.get("hospitalization_history_description") or ""
                        )
                        hosp_txt = f"Ya ({hosp_desc})"
                    health_lines.append(
                        f"6. Rawat Inap / Operasi (2 Tahun Terakhir): {hosp_txt}"
                    )
                    special_txt = "Tidak"
                    if hdata.get("special_needs"):
                        special_desc = hdata.get("special_needs_description") or ""
                        special_txt = f"Ya ({special_desc})"
                    health_lines.append(
                        f"7. Kebutuhan Khusus Saat Belajar: {special_txt}"
                    )
                    health_lines.append("----------------------------------------")
                    health_lines.append("KONTAK DARURAT:")
                    health_lines.append(
                        f"Nama: {hdata.get('emergency_contact_name') or '-'}"
                    )
                    health_lines.append(
                        f"Hubungan: {hdata.get('emergency_contact_relation') or '-'}"
                    )
                    health_lines.append(
                        f"Nomor Telepon: {hdata.get('emergency_contact_phone') or '-'}"
                    )
                    health_lines.append("----------------------------------------")
                    declaration_txt = "Belum Disetujui"
                    if hdata.get("health_declaration_confirmed"):
                        declaration_txt = "Telah Disetujui"
                    health_lines.append(f"Pernyataan Kebenaran Data: {declaration_txt}")
                except Exception:
                    health_lines.append(f"Catatan Riwayat Kesehatan: {raw_health}")
            else:
                health_lines.append(
                    f"Catatan Riwayat Penyakit / Kesehatan: {raw_health or '-'}"
                )
            zf.writestr(
                "formulir_identifikasi_kesehatan.txt", "\n".join(health_lines) + "\n"
            )

            evaluator_notes = dossier["transcript"].get("evaluator_notes", "-")
            transcript_txt = (
                f"TRANSKRIP HASIL SELEKSI PPDB\n"
                f"Pesantren Tahfidz Ar-Rahman\n"
                f"----------------------------------------\n"
                f"Nama: {applicant.get('full_name')}\n"
                f"NISN: {applicant.get('nisn') or '-'}\n"
                f"Jalur: {applicant.get('registration_path')}\n"
                f"Gelombang: {applicant.get('wave_name')}\n"
                f"Periode: {applicant.get('period_name')}\n"
                f"Status: {applicant.get('status')}\n\n"
                f"Skor TIU: {dossier['transcript'].get('tiu_score', '-')}\n"
                f"Catatan Evaluator: {evaluator_notes}\n"
            )
            zf.writestr("transkrip_nilai.txt", transcript_txt)

            loa_txt = (
                f"{dossier['loa'].get('content', '')}\n\n"
                f"Ketentuan: {dossier['loa'].get('fixed_clause', '')}\n"
            )
            zf.writestr("surat_penerimaan_loa.txt", loa_txt)

            if dossier.get("skd"):
                skd_bg = dossier["skd"].get("background_url") or "-"
                skd_link = dossier["skd"].get("whatsapp_group_link") or "-"
                skd_txt = (
                    f"SURAT KETERANGAN DITERIMA (SKD)\n"
                    f"Nomor: {dossier['skd'].get('letter_number')}\n\n"
                    f"Background Latar SKD: {skd_bg}\n"
                    f"Link Grup WhatsApp: {skd_link}\n"
                )
                zf.writestr("surat_keterangan_diterima_skd.txt", skd_txt)

            docs = self.repository.get_documents_by_applicant(applicant_id)
            for d in docs:
                ext = (
                    d.original_name.split(".")[-1] if "." in d.original_name else "dat"
                )
                filename = f"dokumen_asli/{d.doc_type}_{d.id[:8]}.{ext}"
                if d.data:
                    zf.writestr(filename, d.data)
                elif d.storage_path and os.path.exists(d.storage_path):
                    with open(d.storage_path, "rb") as f:
                        zf.writestr(filename, f.read())
                else:
                    zf.writestr(f"{filename}.url.txt", f"URL Unduhan: {d.public_url}")

        from src.models.auth import AuditLog

        zip_full_name = applicant.get("full_name")
        audit = AuditLog(
            id=str(uuid.uuid4()),
            user_id=admin_user.get("id"),
            user_username=admin_user.get("username"),
            action="download_dossier_zip",
            entity_type="ppdb_dossier",
            entity_id=applicant_id,
            changes=(
                f"Mengunduh ZIP dossier pendaftar {zip_full_name} ({applicant_id})"
            ),
            ip_address=ip_address,
            created_at=datetime.now(WIB),
        )
        self.repository.db.add(audit)
        self.repository.db.commit()

        buffer.seek(0)
        zip_name = applicant.get("full_name", "pendaftar").replace(" ", "_")
        zip_filename = f"dossier_{zip_name}_{applicant_id[:8]}.zip"
        return buffer.getvalue(), zip_filename
