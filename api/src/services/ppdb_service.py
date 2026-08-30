import random
import string
import uuid
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Optional, List, Dict, Any

from fastapi import HTTPException
from src.repositories.ppdb_repository import PPDBRepository
from src.models.ppdb import PPDBPeriod, PPDBWave, PPDBApplicant, PPDBPaymentTransaction
from src.models.auth import User
from src.core.security import hash_password
from src.core.notif_service import send_notifications, send_notification
from src.modules.ppdb.schemas import (
    ApplicantRegister,
    PeriodCreate,
    PeriodUpdate,
    WaveCreate,
    WaveUpdate,
)

logger = logging.getLogger("ptdarrahman.ppdb")

class PPDBService:
    def __init__(self, repository: PPDBRepository):
        self.repository = repository

    # -------------------------------------------------------------------------
    # Periods
    # -------------------------------------------------------------------------
    def get_periods(self, page: int, per_page: int, search: str) -> Dict[str, Any]:
        data, total = self.repository.get_periods_paginated(search, page, per_page)
        return {"data": data, "total": total}

    def get_all_periods(self):
        periods = self.repository.get_all_periods()
        return [{"id": p.id, "name": p.name, "status": p.status, "academic_year": p.academic_year} for p in periods]

    def get_period_by_id(self, period_id: str) -> Dict[str, Any]:
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Not found")
        
        waves = self.repository.get_waves_by_period(period_id)
        
        # map to dict
        p_dict = {c.name: getattr(period, c.name) for c in period.__table__.columns}
        p_dict["waves"] = [{c.name: getattr(w, c.name) for c in w.__table__.columns} for w in waves]
        return p_dict

    def create_period(self, body: PeriodCreate):
        period = PPDBPeriod(
            id=f"period-{uuid.uuid4()}",
            name=body.name,
            academic_year=body.academic_year,
            description=body.description,
            status="inactive",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        self.repository.create_period(period)
        return {c.name: getattr(period, c.name) for c in period.__table__.columns}

    def update_period(self, period_id: str, body: PeriodUpdate):
        period = self.repository.get_period_by_id(period_id)
        if not period:
            raise HTTPException(status_code=404, detail="Not found")
        
        period.name = body.name
        period.academic_year = body.academic_year
        period.description = body.description
        period.updated_at = datetime.now()
        
        self.repository.update_period(period)
        return {c.name: getattr(period, c.name) for c in period.__table__.columns}

    def activate_period(self, period_id: str):
        self.repository.set_all_periods_inactive()
        self.repository.activate_period(period_id)
        return {"success": True}

    def deactivate_period(self, period_id: str):
        self.repository.deactivate_period(period_id)
        return {"success": True}

    def delete_period(self, period_id: str):
        period = self.repository.get_period_by_id(period_id)
        if period:
            self.repository.delete_period(period)
        return {"success": True}

    # -------------------------------------------------------------------------
    # Waves
    # -------------------------------------------------------------------------
    def get_waves(self, period_id: Optional[str] = None):
        waves = self.repository.get_waves(period_id)
        return [{c.name: getattr(w, c.name) for c in w.__table__.columns} for w in waves]

    def get_all_waves(self):
        waves = self.repository.get_waves()
        return [{c.name: getattr(w, c.name) for c in w.__table__.columns} for w in waves]

    def get_active_wave_public(self) -> Dict[str, Any]:
        wave = self.repository.get_active_wave()
        if not wave:
            return {"active": False}
        
        return {
            "active": True,
            "id": wave.id,
            "name": wave.name,
            "registration_start_date": wave.registration_start_date,
            "registration_end_date": wave.registration_end_date,
            "allowed_paths": [p.strip() for p in (wave.allowed_paths or "").split(",") if p.strip()],
            "allowed_levels": [l.strip() for l in (wave.allowed_levels or "").split(",") if l.strip()],
        }

    def get_wave_by_id(self, wave_id: str) -> Dict[str, Any]:
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
            registration_fee=body.registration_fee,
            second_stage_fee=body.second_stage_fee if body.second_stage_fee is not None else 0,
            status="inactive",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        self.repository.create_wave(wave)
        return {c.name: getattr(wave, c.name) for c in wave.__table__.columns}

    def update_wave(self, wave_id: str, body: WaveUpdate):
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Not found")

        wave.name = body.name
        wave.allowed_paths = body.allowed_paths
        wave.allowed_levels = body.allowed_levels
        wave.registration_start_date = body.registration_start_date
        wave.registration_end_date = body.registration_end_date
        wave.document_upload_end_date = body.document_upload_end_date
        wave.selection_date = body.selection_date
        wave.quota = body.quota
        wave.registration_fee = body.registration_fee
        wave.updated_at = datetime.now()

        if body.second_stage_fee is not None:
            wave.second_stage_fee = body.second_stage_fee

        self.repository.update_wave(wave)
        return {c.name: getattr(wave, c.name) for c in wave.__table__.columns}

    def activate_wave(self, wave_id: str):
        wave = self.repository.get_wave_by_id(wave_id)
        if not wave:
            raise HTTPException(status_code=404, detail="Wave not found")
        
        period = self.repository.get_period_by_id(wave.period_id)
        if not period or period.status != "active":
            raise HTTPException(status_code=400, detail="Periode belum aktif")

        self.repository.set_all_waves_inactive()
        self.repository.activate_wave(wave_id)
        return {"success": True}

    def deactivate_wave(self, wave_id: str):
        self.repository.deactivate_wave(wave_id)
        return {"success": True}

    def delete_wave(self, wave_id: str):
        wave = self.repository.get_wave_by_id(wave_id)
        if wave:
            self.repository.delete_wave(wave)
        return {"success": True}

    # -------------------------------------------------------------------------
    # Registration
    # -------------------------------------------------------------------------
    def generate_random_password(self, length: int = 8) -> str:
        return "".join(random.choice(string.ascii_letters + string.digits) for _ in range(length))

    def generate_unique_username(self, full_name: str) -> str:
        base = "".join(c for c in full_name.split(" ")[0].lower() if c.isalnum()) or "user"
        for _ in range(10):
            candidate = f"{base}{''.join(random.choice(string.digits) for _ in range(4))}"
            if not self.repository.get_user_by_username(candidate):
                return candidate
        return f"{base}{uuid.uuid4().hex[:8]}"

    def register_applicant(self, body: ApplicantRegister) -> Dict[str, Any]:
        wave = self.repository.get_active_wave()
        if not wave:
            raise HTTPException(status_code=400, detail="Pendaftaran saat ini sedang ditutup atau belum dibuka.")
        
        allowed_paths = [p.strip() for p in (wave.allowed_paths or "").split(",") if p.strip()]
        allowed_levels = [l.strip() for l in (wave.allowed_levels or "").split(",") if l.strip()]
        
        if body.registration_path not in allowed_paths:
            raise HTTPException(
                status_code=400,
                detail=f"Jalur pendaftaran '{body.registration_path}' tidak dibuka pada gelombang ini.",
            )
        
        level_key = body.registration_level.split(" ")[0]
        if level_key not in allowed_levels:
            raise HTTPException(
                status_code=400,
                detail=f"Jenjang '{level_key}' tidak dibuka pada gelombang ini.",
            )

        if self.repository.get_applicant_by_email_active(body.email):
            raise HTTPException(status_code=400, detail="Email sudah terdaftar. Silakan login atau gunakan email lain.")
            
        if self.repository.get_user_by_email(body.email):
            raise HTTPException(
                status_code=400,
                detail="Email sudah pernah terdaftar sebelumnya. Hubungi panitia jika ingin mendaftar ulang.",
            )

        raw_password = self.generate_random_password()
        username = self.generate_unique_username(body.full_name)
        role_id = self.repository.get_role_id_by_name("Calon Murid")
        
        now = datetime.now()
        payment_deadline = datetime.now(ZoneInfo("Asia/Jakarta")) + timedelta(days=7)
        payment_deadline_str = payment_deadline.strftime("%Y-%m-%d %H:%M:%S")

        user = User(
            id=str(uuid.uuid4()),
            username=username,
            password_hash=hash_password(raw_password),
            email=body.email,
            full_name=body.full_name,
            user_type="applicant",
            role_id=role_id,
            created_at=now,
            updated_at=now
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
            payment_deadline=payment_deadline_str,
            created_at=now,
            updated_at=now
        )
        
        transaction = PPDBPaymentTransaction(
            id=f"pay-{uuid.uuid4()}",
            applicant_id=applicant.id,
            method="offline",
            amount=wave.registration_fee or 0,
            status="pending",
            created_at=now,
            updated_at=now
        )

        try:
            user, applicant = self.repository.create_user_and_applicant(user, applicant, transaction)
        except IntegrityError:
            logger.exception("Duplicate on register: email=%s username=%s", body.email, username)
            raise HTTPException(
                status_code=400,
                detail="Email sudah terdaftar. Silakan login atau gunakan email lain.",
            )

        from src.core.config import settings
        
        try:
            send_notifications(
                [
                    ("welcome", {
                        "password": raw_password,
                        "link_login": f"{settings.ppdb_frontend_url}/auth/login",
                        "batas_waktu_bayar": applicant.payment_deadline,
                    }),
                    ("payment_reminder", {
                        "link_pembayaran": f"{settings.ppdb_frontend_url}/checkout",
                        "batas_waktu_bayar": applicant.payment_deadline,
                    }),
                ],
                user.id,
                user_row={"id": user.id, "email": user.email, "username": user.username, "full_name": user.full_name},
                applicant_row={"id": applicant.id, "full_name": applicant.full_name}
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
    def get_applicants(self, page: int, per_page: int, search: str, wave_id: Optional[str], status: Optional[str]):
        resolved_wave_id = wave_id
        if not resolved_wave_id:
            active_wave = self.repository.get_active_wave()
            if not active_wave:
                return {"data": [], "total": 0, "active_wave": None}
            resolved_wave_id = active_wave.id

        data, total = self.repository.get_applicants_paginated(resolved_wave_id, search, status, page, per_page)
        return {"data": data, "total": total, "active_wave": resolved_wave_id}

    def reset_applicant_password(self, applicant_id: str, new_password: str) -> Dict[str, Any]:
        applicant = self.repository.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
        
        if not applicant.user_id:
            raise HTTPException(status_code=400, detail="Akun login pendaftar tidak ditemukan")

        new_password = (new_password or "").strip()
        if not new_password:
            return {"changed": False, "message": "Password tidak diubah (field kosong)"}

        user = self.repository.get_user_by_id(applicant.user_id)
        if not user:
            raise HTTPException(status_code=400, detail="Akun login pendaftar tidak ditemukan")

        self.repository.update_user_password(user, hash_password(new_password))

        from src.core.config import settings
        try:
            send_notifications(
                [("password_reset", {
                    "password": new_password,
                    "link_login": f"{settings.ppdb_frontend_url}/auth/login",
                })],
                user.id,
                user_row={"id": user.id, "email": user.email, "username": user.username, "full_name": user.full_name},
                applicant_row={"id": applicant.id, "full_name": applicant.full_name}
            )
        except Exception:
            logger.exception("send password_reset notification failed; continuing")

        return {
            "changed": True,
            "message": "Password berhasil direset",
            "username": user.username,
            "password": new_password,
        }

    def get_dashboard_stats(self) -> Dict[str, Any]:
        return {
            "total_periods": self.repository.count_periods(),
            "total_waves": self.repository.count_waves(),
            "active_period_name": self.repository.get_active_period_name(),
        }

    def soft_delete_expired_applicants(self) -> Dict[str, Any]:
        now = datetime.now(ZoneInfo("Asia/Jakarta"))
        now_str = now.strftime("%Y-%m-%d %H:%M:%S")
        
        applicants = self.repository.get_expired_pending_applicants(now_str)
        if not applicants:
            return {"deleted": 0}
            
        self.repository.soft_delete_applicants(applicants, now_str)
        
        for app in applicants:
            send_notifications([("payment_expired", {})], app.user_id)
            
        return {"deleted": len(applicants), "applicant_ids": [a.id for a in applicants]}

    def run_reminders(self) -> Dict[str, Any]:
        now_wib = datetime.now(ZoneInfo("Asia/Jakarta"))
        now_wib_str = now_wib.strftime("%Y-%m-%d %H:%M:%S")
        tomorrow_wib = now_wib + timedelta(days=1)
        tomorrow_wib_str = tomorrow_wib.strftime("%Y-%m-%d %H:%M:%S")
        
        # Payment reminders
        payment_apps = self.repository.get_applicants_for_payment_reminder(now_wib_str, tomorrow_wib_str)
        for app in payment_apps:
            send_notification("payment_reminder_d7", app.user_id, {"batas_waktu_bayar": tomorrow_wib_str})
            
        # Document reminders
        doc_apps = self.repository.get_applicants_for_document_reminder()
        for app, wave in doc_apps:
            end_date = wave.document_upload_end_date
            if not end_date:
                continue
            
            if isinstance(end_date, str):
                try:
                    end_date = datetime.strptime(end_date, "%Y-%m-%d %H:%M:%S").date()
                except ValueError:
                    end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
            elif isinstance(end_date, datetime):
                end_date = end_date.date()
                
            days_left = (end_date - now_wib.date()).days
            if days_left == 3:
                send_notification("document_reminder_d3", app.user_id, {})
            elif days_left == 1:
                send_notification("document_reminder_d1", app.user_id, {})
                
        # Selection reminders
        sel_apps = self.repository.get_applicants_for_selection_reminder()
        for app, wave in sel_apps:
            sel_date = wave.selection_date
            if not sel_date:
                continue
                
            if isinstance(sel_date, str):
                try:
                    sel_date = datetime.strptime(sel_date, "%Y-%m-%d %H:%M:%S").date()
                except ValueError:
                    sel_date = datetime.strptime(sel_date, "%Y-%m-%d").date()
            elif isinstance(sel_date, datetime):
                sel_date = sel_date.date()
                
            days_left = (sel_date - now_wib.date()).days
            if days_left == 5:
                send_notification("selection_reminder_d5", app.user_id, {})
            elif days_left == 1:
                send_notification("selection_reminder_d1", app.user_id, {})
                
        return {"success": True}
