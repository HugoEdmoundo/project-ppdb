from datetime import date, datetime, timedelta
from typing import Any
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from src.core.notif_service import send_notifications
from src.models.selection import (
    SelectionCategory,
    SelectionCriteria,
    SelectionScore,
    SelectionSession,
)
from src.modules.selection.schemas import (
    ApplicantScoreSave,
    ApplicantStatusUpdate,
    CategoryCreate,
    CriteriaCreate,
    SessionCreate,
    SessionUpdate,
)
from src.repositories.selection_repository import SelectionRepository

WIB = ZoneInfo("Asia/Jakarta")


def _now_wib() -> datetime:
    return datetime.now(WIB).replace(tzinfo=None)


def _parse_session_date(raw: str | None) -> date | None:
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail="Format tanggal sesi tidak valid (YYYY-MM-DD)"
        ) from exc


class SelectionService:
    def __init__(self, repo: SelectionRepository):
        self.repo = repo

    def _get_active_wave_id_or_400(self) -> str:
        wave_id = self.repo.get_active_wave_id()
        if not wave_id:
            raise HTTPException(
                status_code=400, detail="Tidak ada gelombang yang sedang aktif."
            )
        return wave_id

    def get_sessions(self) -> list[dict[str, Any]]:
        wave_id = self._get_active_wave_id_or_400()
        rows = self.repo.get_sessions(wave_id)
        result = []
        for session, wave_name, booked_count in rows:
            d = session.__dict__.copy()
            d.pop("_sa_instance_state", None)
            d["wave_name"] = wave_name
            d["booked_count"] = booked_count or 0
            result.append(d)
        return result

    def _require_active_wave_session(self, session_id: str):
        """Ambil sesi dan pastikan milik gelombang aktif (404 jika tidak)."""
        wave_id = self._get_active_wave_id_or_400()
        session = self.repo.get_session_by_id(session_id)
        if not session or session.wave_id != wave_id:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
        return session

    def create_session(self, body: SessionCreate) -> dict[str, Any]:
        now = _now_wib()
        wave_id = self._get_active_wave_id_or_400()
        sid = str(uuid4())
        session = SelectionSession(
            id=sid,
            wave_id=wave_id,
            name=body.name,
            session_date=_parse_session_date(body.session_date),
            start_time=body.start_time,
            end_time=body.end_time,
            location=body.location,
            description=body.description,
            quota=body.quota,
            created_at=now,
            updated_at=now,
        )
        self.repo.create_session(session)
        self.repo.db.commit()
        return {"id": sid, "message": "Sesi seleksi berhasil dibuat"}

    def update_session(self, session_id: str, body: SessionUpdate) -> dict[str, Any]:
        now = _now_wib()
        session = self._require_active_wave_session(session_id)

        session.name = body.name
        session.session_date = _parse_session_date(body.session_date)
        session.start_time = body.start_time
        session.end_time = body.end_time
        session.location = body.location
        session.description = body.description
        session.quota = body.quota
        session.updated_at = now

        self.repo.update_session(session)
        self.repo.db.commit()
        return {"message": "Sesi berhasil diperbarui"}

    def delete_session(self, session_id: str) -> dict[str, Any]:
        self._require_active_wave_session(session_id)
        self.repo.delete_session(session_id)
        self.repo.db.commit()
        return {"message": "Sesi berhasil dihapus"}

    def broadcast_session(self, session_id: str, message: str) -> dict[str, Any]:
        session = self._require_active_wave_session(session_id)

        applicants = self.repo.get_applicants_in_session(session_id)
        for app in applicants:
            send_notifications(
                [
                    (
                        "selection_session_broadcast",
                        {"custom_message": message, "session_name": session.name},
                    )
                ],
                app.user_id,
            )
        return {"message": f"Notifikasi berhasil dikirim ke {len(applicants)} peserta."}

    def get_categories(self) -> list[dict[str, Any]]:
        wave_id = self._get_active_wave_id_or_400()
        categories = self.repo.get_categories(wave_id)
        result = []
        for c in categories:
            c_dict = c.__dict__.copy()
            c_dict.pop("_sa_instance_state", None)
            crits = self.repo.get_criteria_by_category(c.id)
            c_dict["criteria"] = [cr.__dict__.copy() for cr in crits]
            for cr in c_dict["criteria"]:
                cr.pop("_sa_instance_state", None)
            result.append(c_dict)
        return result

    def create_category(self, body: CategoryCreate) -> dict[str, Any]:
        now = _now_wib()
        wave_id = self._get_active_wave_id_or_400()
        cid = str(uuid4())
        cat = SelectionCategory(
            id=cid, wave_id=wave_id, name=body.name, created_at=now, updated_at=now
        )
        self.repo.create_category(cat)
        self.repo.db.commit()
        return {"id": cid, "message": "Kategori berhasil dibuat"}

    def create_criteria(self, category_id: str, body: CriteriaCreate) -> dict[str, Any]:
        now = _now_wib()
        wave_id = self._get_active_wave_id_or_400()
        category = self.repo.get_category_by_id(category_id)
        if not category or category.wave_id != wave_id:
            raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
        crid = str(uuid4())
        crit = SelectionCriteria(
            id=crid,
            category_id=category_id,
            name=body.name,
            created_at=now,
            updated_at=now,
        )
        self.repo.create_criteria(crit)
        self.repo.db.commit()
        return {"id": crid, "message": "Kriteria berhasil ditambahkan"}

    def delete_category(self, id: str) -> dict[str, Any]:
        wave_id = self._get_active_wave_id_or_400()
        category = self.repo.get_category_by_id(id)
        if not category or category.wave_id != wave_id:
            raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
        self.repo.delete_category(id)
        self.repo.db.commit()
        return {"message": "Kategori dihapus"}

    def delete_criteria(self, id: str) -> dict[str, Any]:
        wave_id = self._get_active_wave_id_or_400()
        criteria = self.repo.get_criteria_by_id(id)
        if not criteria:
            raise HTTPException(status_code=404, detail="Kriteria tidak ditemukan")
        category = self.repo.get_category_by_id(criteria.category_id)
        if not category or category.wave_id != wave_id:
            raise HTTPException(status_code=404, detail="Kriteria tidak ditemukan")
        self.repo.delete_criteria(id)
        self.repo.db.commit()
        return {"message": "Kriteria dihapus"}

    def get_results(self) -> list[dict[str, Any]]:
        wave_id = self._get_active_wave_id_or_400()
        rows = self.repo.get_results(wave_id)
        results = []
        for s_res, app, s_ses, wave_name in rows:
            rd = {
                "result_id": s_res.id if s_res else None,
                "applicant_id": s_res.applicant_id if s_res else app.id,
                "session_id": s_res.session_id if s_res else None,
                "notes": s_res.notes if s_res else None,
                "full_name": app.full_name,
                "email": app.email,
                "phone": app.phone,
                "registration_path": app.registration_path,
                "registration_level": app.registration_level,
                "applicant_status": app.status,
                "session_name": s_ses.name if s_ses else None,
                "session_date": s_ses.session_date if s_ses else None,
                "location": s_ses.location if s_ses else None,
                "wave_name": wave_name,
            }
            scores = self.repo.get_applicant_scores(app.id)
            rd["scores"] = [
                {"criteria_id": sc.criteria_id, "score": sc.score} for sc in scores
            ]
            results.append(rd)
        return results

    def save_result(self, body: ApplicantScoreSave) -> dict[str, Any]:
        import math

        now = _now_wib()
        wave_id = self._get_active_wave_id_or_400()
        app = self.repo.get_applicant_by_id(body.applicant_id)
        if not app:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        # Pastikan baris hasil ada dulu agar notes/skor tersimpan.
        self.repo.ensure_selection_result(body.applicant_id, now)
        self.repo.update_selection_result_notes(body.applicant_id, body.notes, now)

        for sc in body.scores:
            if not math.isfinite(sc.score) or sc.score < 0:
                raise HTTPException(
                    status_code=400, detail="Nilai harus berupa angka >= 0"
                )
            criteria = self.repo.get_criteria_by_id(sc.criteria_id)
            if not criteria:
                raise HTTPException(
                    status_code=400, detail="Kriteria tidak ditemukan"
                )
            category = self.repo.get_category_by_id(criteria.category_id)
            if not category or category.wave_id != wave_id:
                raise HTTPException(
                    status_code=400, detail="Kriteria tidak termasuk gelombang aktif"
                )
            existing = self.repo.get_selection_score(body.applicant_id, sc.criteria_id)
            if existing:
                existing.score = sc.score
                existing.updated_at = now
                self.repo.update_selection_score(existing)
            else:
                new_score = SelectionScore(
                    id=str(uuid4()),
                    applicant_id=body.applicant_id,
                    criteria_id=sc.criteria_id,
                    score=sc.score,
                    created_at=now,
                    updated_at=now,
                )
                self.repo.add_selection_score(new_score)

        self.repo.db.commit()
        return {"message": "Nilai berhasil disimpan"}

    def update_applicant_status(
        self, applicant_id: str, body: ApplicantStatusUpdate
    ) -> dict[str, Any]:
        now = _now_wib()
        app = self.repo.get_applicant_by_id(applicant_id)
        if not app:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

        if body.status not in ["passed", "failed", "selection"]:
            raise HTTPException(status_code=400, detail="Status tidak valid")

        app.status = body.status
        app.updated_at = now
        self.repo.update_applicant(app)

        # Sinkronkan graduation_status agar filter pendaftar lulus
        # (Tahap 2 / MOU) ikut terisi.
        result_row = self.repo.ensure_selection_result(applicant_id, now)
        result_row.graduation_status = (
            {"passed": "passed", "failed": "failed"}.get(body.status)
        )
        result_row.updated_at = now
        self.repo.db.add(result_row)

        if body.reason is not None:
            self.repo.update_selection_result_notes(applicant_id, body.reason, now)

        self.repo.db.commit()
        return {"message": f"Status pendaftar diubah menjadi {body.status}"}

    def applicant_get_my_session(self, user_id: str) -> dict[str, Any]:
        app = self.repo.get_applicant_by_user_id(user_id)
        if not app:
            raise HTTPException(status_code=404, detail="Bukan pendaftar")

        s_res = self.repo.get_selection_result_by_applicant(app.id)
        my_session = None
        if s_res and s_res.session_id:
            s_row = self.repo.get_session_by_id(s_res.session_id)
            if s_row:
                my_session = s_row.__dict__.copy()
                my_session.pop("_sa_instance_state", None)

        av_rows = self.repo.get_sessions(app.wave_id)
        available = []
        for s, _, booked_count in av_rows:
            sd = s.__dict__.copy()
            sd.pop("_sa_instance_state", None)
            sd["booked_count"] = booked_count or 0
            available.append(sd)

        return {"session": my_session, "available_sessions": available}

    def applicant_book_session(self, user_id: str, session_id: str) -> dict[str, Any]:
        now = _now_wib()
        app = self.repo.get_applicant_by_user_id(user_id)
        if not app:
            raise HTTPException(status_code=404, detail="Bukan pendaftar")

        s_data = self.repo.get_session_with_booked_count(session_id)
        if not s_data:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")

        session, booked_count = s_data
        booked_count = booked_count or 0
        if session.wave_id != app.wave_id:
            raise HTTPException(
                status_code=400, detail="Sesi bukan dari gelombang Anda"
            )
        if session.quota > 0 and booked_count >= session.quota:
            raise HTTPException(status_code=400, detail="Kuota sesi ini sudah penuh")

        self.repo.update_selection_result_session(app.id, session_id, now)
        self.repo.db.commit()
        return {"message": f"Berhasil memilih {session.name}"}

    def applicant_get_my_results(self, user_id: str) -> dict[str, Any]:
        app = self.repo.get_applicant_by_user_id(user_id)
        if not app:
            raise HTTPException(status_code=404, detail="Bukan pendaftar")

        s_res = self.repo.get_selection_result_by_applicant(app.id)
        notes = s_res.notes if s_res else None

        scores_rows = self.repo.get_applicant_scores_with_details(app.id)
        scores = []
        for sc, c_name, cat_name in scores_rows:
            scores.append(
                {"score": sc, "criteria_name": c_name, "category_name": cat_name}
            )

        return {"notes": notes, "scores": scores}

    def auto_assign_sessions(self) -> dict[str, Any]:
        now_wib = _now_wib()
        wave_id = self.repo.get_active_wave_id()
        if not wave_id:
            return {"message": "No active wave", "assigned": 0}

        today_iso = datetime.now(ZoneInfo("Asia/Jakarta")).date().isoformat()
        earliest_session = self.repo.get_earliest_session_date(wave_id, today_iso)

        if not earliest_session:
            return {"message": "No upcoming sessions found.", "assigned": 0}

        if isinstance(earliest_session, str):
            s_date = datetime.strptime(earliest_session, "%Y-%m-%d").date()
        else:
            s_date = earliest_session

        today = datetime.now(ZoneInfo("Asia/Jakarta")).date()

        if (s_date - today).days > 3:
            return {
                "message": f"Earliest session is {s_date}, >3 days away. Skip.",
                "assigned": 0,
            }

        unassigned = self.repo.get_unassigned_applicants(wave_id)
        if not unassigned:
            return {"message": "All assigned", "assigned": 0}

        avail_sessions_rows = self.repo.get_available_sessions(wave_id, today_iso)
        avail_sessions = []
        for s, count in avail_sessions_rows:
            avail_sessions.append(
                {"id": s.id, "quota": s.quota, "booked_count": count or 0}
            )

        assigned_count = 0
        for app_id in unassigned:
            target_session = None
            for s in avail_sessions:
                if s["quota"] == 0 or s["booked_count"] < s["quota"]:
                    target_session = s
                    break

            if target_session:
                self.repo.update_selection_result_session(
                    app_id, target_session["id"], now_wib
                )
                target_session["booked_count"] += 1
                assigned_count += 1

        self.repo.db.commit()
        return {
            "message": f"Successfully auto-assigned {assigned_count} applicants",
            "assigned": assigned_count,
        }

    def send_h1_reminders(self) -> dict[str, Any]:
        wave_id = self.repo.get_active_wave_id()
        if not wave_id:
            return {"message": "No active wave", "sent": 0}

        tomorrow = (
            datetime.now(ZoneInfo("Asia/Jakarta")).date() + timedelta(days=1)
        ).isoformat()
        sessions = self.repo.get_sessions_by_date(wave_id, tomorrow)

        sent_count = 0
        for s in sessions:
            apps = self.repo.get_applicants_in_session(s.id)
            if not apps:
                continue

            notif_data = {
                "session_name": s.name,
                "start_time": s.start_time or "-",
                "location": s.location or "-",
            }

            for app in apps:
                if app.user_id:
                    send_notifications(
                        [("selection_reminder", notif_data)], app.user_id
                    )
                    sent_count += 1

        return {"message": f"Sent {sent_count} reminders", "sent": sent_count}
