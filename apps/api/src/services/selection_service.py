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
    CriteriaUpdate,
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


def _is_tiu_category_name(name: str) -> bool:
    normalized = " ".join(name.casefold().replace("-", " ").split())
    return "tiu" in normalized.split() or "intelegensi umum" in normalized


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

    def get_sessions(self, session_type: str | None = None) -> list[dict[str, Any]]:
        wave_id = self._get_active_wave_id_or_400()
        return self.repo.get_sessions_with_booking_details(
            wave_id, session_type=session_type
        )

    def _require_active_wave_session(self, session_id: str):
        """Ambil sesi dan pastikan milik gelombang aktif (404 jika tidak)."""
        wave_id = self._get_active_wave_id_or_400()
        session = self.repo.get_session_by_id(session_id)
        if not session or session.wave_id != wave_id:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
        return session

    def create_session(
        self, body: SessionCreate, creator_user_id: str | None = None
    ) -> dict[str, Any]:
        now = _now_wib()
        sess_date = _parse_session_date(body.session_date)
        wave_id = self._get_active_wave_id_or_400()
        sid = str(uuid4())
        quota = body.quota if body.quota > 0 else 1  # 1 Slot = 1 Pendaftar (Sesi 1:1)
        session = SelectionSession(
            id=sid,
            wave_id=wave_id,
            name=body.name,
            session_type=body.session_type,
            session_date=sess_date,
            start_time=body.start_time,
            end_time=body.end_time,
            mode=body.mode,
            officer_name=body.officer_name,
            location=body.location,
            meeting_url=str(body.meeting_url) if body.meeting_url else None,
            description=body.description,
            quota=quota,
            created_by=creator_user_id,
            created_at=now,
            updated_at=now,
        )
        self.repo.create_session(session)
        self.repo.db.commit()
        return {"id": sid, "message": "Sesi 1:1 berhasil dibuat"}

    def get_session_evaluation_detail(self, session_id: str) -> dict[str, Any]:
        from sqlalchemy import or_

        from src.models.selection import SelectionResult
        from src.repositories.ppdb_repository import PPDBRepository

        session = self.repo.get_session_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")

        # Cari pendaftar yang mengambil sesi ini
        s_res = (
            self.repo.db.query(SelectionResult)
            .filter(
                or_(
                    SelectionResult.session_id == session_id,
                    SelectionResult.interview_session_id == session_id,
                )
            )
            .first()
        )
        if not s_res or not s_res.applicant_id:
            raise HTTPException(
                status_code=400,
                detail="Sesi ini belum diambil oleh pendaftar (status masih merah).",
            )

        ppdb_repo = PPDBRepository(self.repo.db)
        applicant_detail = ppdb_repo.get_applicant_detail(s_res.applicant_id)
        if not applicant_detail:
            raise HTTPException(
                status_code=404, detail="Data pendaftar tidak ditemukan."
            )

        # Dokumen pendaftar
        applicant_detail["documents"] = ppdb_repo.get_applicant_documents(
            s_res.applicant_id
        )

        # Nilai TIU jika ada
        tiu_res = self.repo.get_tiu_result_by_applicant(s_res.applicant_id)
        tiu_score = tiu_res.score if tiu_res else None

        # Nilai Tahfidz yang sudah ada
        tahfidz_scores = []
        scores_rows = self.repo.get_applicant_scores_with_details(s_res.applicant_id)
        for sc, c_name, cat_name in scores_rows:
            if "tahfidz" in (cat_name or "").lower():
                tahfidz_scores.append(
                    {
                        "score": sc,
                        "criteria_name": c_name,
                        "category_name": cat_name,
                    }
                )

        # Ambil rubrik sesuai jenis sesi (Tahfidz atau Wawancara)
        stype = (session.session_type or "tahfidz").lower()
        target_keyword = (
            "wawancara" if ("wawancara" in stype or "interview" in stype) else "tahfidz"
        )

        all_categories = list(self.repo.get_categories("global")) + list(
            self.repo.get_categories(session.wave_id)
        )
        seen_cat_ids = set()
        matched_categories = []

        for cat in all_categories:
            if cat.id in seen_cat_ids:
                continue
            seen_cat_ids.add(cat.id)
            if target_keyword in (cat.name or "").lower():
                crit_list = self.repo.get_criteria_by_category(cat.id)
                matched_categories.append(
                    {
                        "id": cat.id,
                        "name": cat.name,
                        "criteria": [
                            {
                                "id": cr.id,
                                "name": cr.name,
                                "description": cr.description,
                                "weight": cr.weight,
                            }
                            for cr in crit_list
                        ],
                    }
                )

        if not matched_categories:
            for cat in all_categories:
                if cat.id in seen_cat_ids:
                    continue
                seen_cat_ids.add(cat.id)
                if not _is_tiu_category_name(cat.name):
                    crit_list = self.repo.get_criteria_by_category(cat.id)
                    matched_categories.append(
                        {
                            "id": cat.id,
                            "name": cat.name,
                            "criteria": [
                                {
                                    "id": cr.id,
                                    "name": cr.name,
                                    "description": cr.description,
                                    "weight": cr.weight,
                                }
                                for cr in crit_list
                            ],
                        }
                    )

        existing_scores = {}
        for sc, c_name, cat_name in scores_rows:
            for m_cat in matched_categories:
                for cr in m_cat["criteria"]:
                    if cr["name"] == c_name and m_cat["name"] == cat_name:
                        existing_scores[cr["id"]] = sc

        sess_dict = session.__dict__.copy()
        sess_dict.pop("_sa_instance_state", None)

        return {
            "session": sess_dict,
            "applicant": applicant_detail,
            "categories": matched_categories,
            "existing_scores": existing_scores,
            "evaluator_notes": s_res.notes or "",
            "tiu_score": tiu_score,
            "tahfidz_scores": tahfidz_scores,
            "graduation_status": s_res.graduation_status,
        }

    def update_session(self, session_id: str, body: SessionUpdate) -> dict[str, Any]:
        now = _now_wib()
        session = self._require_active_wave_session(session_id)

        session.name = body.name
        session.session_type = body.session_type
        session.session_date = _parse_session_date(body.session_date)
        session.start_time = body.start_time
        session.end_time = body.end_time
        session.mode = body.mode
        session.officer_name = body.officer_name
        session.location = body.location
        session.meeting_url = str(body.meeting_url) if body.meeting_url else None
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
        now = _now_wib()
        required_cats = ["Tahfidz", "Wawancara"]

        # Kategori bersifat global (tidak terikat gelombang aktif)
        existing = (
            self.repo.db.query(SelectionCategory)
            .filter(SelectionCategory.wave_id == "global")
            .all()
        )
        existing_names = {c.name for c in existing}

        for name in required_cats:
            if name not in existing_names:
                new_cat = SelectionCategory(
                    id=str(uuid4()),
                    wave_id="global",
                    name=name,
                    created_at=now,
                    updated_at=now,
                )
                self.repo.db.add(new_cat)

        if len(existing_names) < len(required_cats):
            self.repo.db.commit()
            existing = (
                self.repo.db.query(SelectionCategory)
                .filter(SelectionCategory.wave_id == "global")
                .all()
            )

        valid_categories = [c for c in existing if c.name in required_cats]
        # Urutkan Tahfidz pertama, Wawancara kedua
        valid_categories.sort(key=lambda c: 0 if c.name == "Tahfidz" else 1)

        result = []
        for c in valid_categories:
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
        if _is_tiu_category_name(body.name):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Nilai TIU masuk otomatis dan tidak menggunakan kategori "
                    "input manual."
                ),
            )
        cid = str(uuid4())
        cat = SelectionCategory(
            id=cid, wave_id="global", name=body.name, created_at=now, updated_at=now
        )
        self.repo.create_category(cat)
        self.repo.db.commit()
        return {"id": cid, "message": "Kategori berhasil dibuat"}

    def create_criteria(self, category_id: str, body: CriteriaCreate) -> dict[str, Any]:
        now = _now_wib()
        category = self.repo.get_category_by_id(category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
        current_weight = sum(
            float(item.weight or 0)
            for item in self.repo.get_criteria_by_category(category_id)
        )
        if current_weight + body.weight > 100.000001:
            raise HTTPException(
                status_code=400, detail="Total bobot kriteria tidak boleh melebihi 100%"
            )
        crid = str(uuid4())
        crit = SelectionCriteria(
            id=crid,
            category_id=category_id,
            name=body.name,
            description=body.description,
            weight=body.weight,
            created_at=now,
            updated_at=now,
        )
        self.repo.create_criteria(crit)
        self.repo.db.commit()
        return {"id": crid, "message": "Kriteria berhasil ditambahkan"}

    def update_criteria(self, criteria_id: str, body: CriteriaUpdate) -> dict[str, Any]:
        now = _now_wib()
        criteria = self.repo.get_criteria_by_id(criteria_id)
        if not criteria:
            raise HTTPException(status_code=404, detail="Kriteria tidak ditemukan")
        category = self.repo.get_category_by_id(criteria.category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
        other_weight = sum(
            float(item.weight or 0)
            for item in self.repo.get_criteria_by_category(category.id)
            if item.id != criteria_id
        )
        if other_weight + body.weight > 100.000001:
            raise HTTPException(
                status_code=400, detail="Total bobot kriteria tidak boleh melebihi 100%"
            )
        criteria.name = body.name
        criteria.description = body.description
        criteria.weight = body.weight
        criteria.updated_at = now
        self.repo.db.commit()
        return {"message": "Kriteria berhasil diperbarui"}

    def delete_category(self, id: str) -> dict[str, Any]:
        category = self.repo.get_category_by_id(id)
        if not category:
            raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
        self.repo.delete_category(id)
        self.repo.db.commit()
        return {"message": "Kategori dihapus"}

    def delete_criteria(self, id: str) -> dict[str, Any]:
        criteria = self.repo.get_criteria_by_id(id)
        if not criteria:
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

    def get_result_by_applicant(self, applicant_id: str) -> dict[str, Any]:
        app = self.repo.get_applicant_by_id(applicant_id)
        if not app:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
        s_res = self.repo.get_selection_result_by_applicant(applicant_id)
        scores = self.repo.get_applicant_scores(applicant_id)
        tiu = self.repo.get_tiu_result_by_applicant(applicant_id)
        return {
            "result_id": s_res.id if s_res else None,
            "applicant_id": applicant_id,
            "session_id": s_res.session_id if s_res else None,
            "notes": s_res.notes if s_res else None,
            "scores": [
                {"criteria_id": sc.criteria_id, "score": sc.score} for sc in scores
            ],
            "tiu_score": tiu.score if tiu else None,
            "tiu_completed_at": tiu.completed_at.isoformat()
            if tiu and tiu.completed_at
            else None,
        }

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
            if not math.isfinite(sc.score) or sc.score < 0 or sc.score > 100:
                raise HTTPException(
                    status_code=400, detail="Nilai harus berada di antara 0 dan 100"
                )
            criteria = self.repo.get_criteria_by_id(sc.criteria_id)
            if not criteria:
                raise HTTPException(status_code=400, detail="Kriteria tidak ditemukan")
            category = self.repo.get_category_by_id(criteria.category_id)
            # Kategori global (wave_id="global") valid untuk semua gelombang
            if not category or (
                category.wave_id != "global" and category.wave_id != wave_id
            ):
                raise HTTPException(
                    status_code=400, detail="Kriteria tidak ditemukan atau tidak valid"
                )
            if _is_tiu_category_name(category.name):
                raise HTTPException(
                    status_code=400,
                    detail="Nilai TIU masuk otomatis dan tidak dapat diinput manual.",
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

        # Notifikasi berdasarkan tipe sesi yang diassign ke pendaftar (Fase 3 spec).
        try:
            from src.core.config import settings

            app = self.repo.get_applicant_by_id(body.applicant_id)
            if app:
                first_crit = (
                    self.repo.get_criteria_by_id(body.scores[0].criteria_id)
                    if body.scores
                    else None
                )
                cat = (
                    self.repo.get_category_by_id(first_crit.category_id)
                    if first_crit
                    else None
                )
                cat_name = (cat.name or "").lower() if cat else ""

                if "tahfidz" in cat_name:
                    send_notifications(
                        [
                            (
                                "tahfidz_score_recorded",
                                {
                                    "link_aplikasi": (
                                        f"{settings.ppdb_frontend_url}/dashboard"
                                    ),
                                },
                            )
                        ],
                        app.user_id,
                    )
                elif "wawancara" in cat_name or "interview" in cat_name:
                    send_notifications(
                        [("interview_completed", {})],
                        app.user_id,
                    )
        except Exception:
            import logging

            logging.getLogger("ptdarrahman.selection").exception(
                "score-recorded notification failed; continuing"
            )

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
        result_row.graduation_status = {"passed": "passed", "failed": "failed"}.get(
            body.status
        )
        result_row.updated_at = now
        self.repo.db.add(result_row)

        if body.reason is not None:
            self.repo.update_selection_result_notes(applicant_id, body.reason, now)

        self.repo.db.commit()

        # Send notification if passed or failed
        if body.status == "passed":
            from src.core.config import settings

            send_notifications(
                [
                    (
                        "selection_result_passed",
                        {
                            "nama_sekolah": "Pesantren Tahfidz Ar-Rahman",
                            "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                        },
                    ),
                ],
                app.user_id,
            )
        elif body.status == "failed":
            send_notifications(
                [
                    (
                        "selection_result_failed",
                        {
                            "nama_sekolah": "Pesantren Tahfidz Ar-Rahman",
                        },
                    ),
                ],
                app.user_id,
            )

        return {"message": f"Status pendaftar diubah menjadi {body.status}"}

    def applicant_get_my_session(self, user_id: str) -> dict[str, Any]:
        app = self.repo.get_applicant_by_user_id(user_id)
        if not app:
            raise HTTPException(status_code=404, detail="Bukan pendaftar")

        s_res = self.repo.get_selection_result_by_applicant(app.id)
        tahfidz_session = None
        interview_session = None
        if s_res:
            if s_res.session_id:
                s_row = self.repo.get_session_by_id(s_res.session_id)
                if s_row:
                    tahfidz_session = s_row.__dict__.copy()
                    tahfidz_session.pop("_sa_instance_state", None)
            if hasattr(s_res, "interview_session_id") and s_res.interview_session_id:
                i_row = self.repo.get_session_by_id(s_res.interview_session_id)
                if i_row:
                    interview_session = i_row.__dict__.copy()
                    interview_session.pop("_sa_instance_state", None)

        scores = self.repo.get_applicant_scores_with_details(app.id)
        has_tahfidz = any(
            "tahfidz" in (row[2] or "").lower() or "tahfidz" in (row[1] or "").lower()
            for row in scores
        )
        has_interview = any(
            "wawancara" in (row[2] or "").lower()
            or "wawancara" in (row[1] or "").lower()
            or "interview" in (row[2] or "").lower()
            for row in scores
        )

        av_rows = self.repo.get_sessions(app.wave_id)
        available_tahfidz = []
        available_interview = []
        available = []
        for s, _, booked_count in av_rows:
            sd = s.__dict__.copy()
            sd.pop("_sa_instance_state", None)
            sd["booked_count"] = booked_count or 0
            stype = (s.session_type or "").lower()
            if "wawancara" in stype or "interview" in stype:
                if has_tahfidz:
                    available_interview.append(sd)
                    available.append(sd)
            else:
                available_tahfidz.append(sd)
                available.append(sd)

        return {
            "session": tahfidz_session or interview_session,
            "tahfidz_session": tahfidz_session,
            "interview_session": interview_session,
            "available_sessions": available,
            "available_tahfidz_sessions": available_tahfidz,
            "available_interview_sessions": available_interview,
            "has_tahfidz_score": has_tahfidz,
            "has_interview_score": has_interview,
        }

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

        stype = (session.session_type or "").lower()
        if "wawancara" in stype or "interview" in stype:
            scores = self.repo.get_applicant_scores_with_details(app.id)
            has_tahfidz = any(
                "tahfidz" in (row[2] or "").lower()
                or "tahfidz" in (row[1] or "").lower()
                for row in scores
            )
            if not has_tahfidz:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Anda harus memiliki nilai ujian Tahfidz sebelum memilih "
                        "jadwal wawancara."
                    ),
                )
            self.repo.update_selection_result_session(
                app.id, session_id, now, session_type="wawancara"
            )
        else:
            reg_path = (app.registration_path or "").lower()
            if any(k in reg_path for k in ["reguler", "tiu", "tes"]):
                tiu = self.repo.get_tiu_result_by_applicant(app.id)
                if not tiu or tiu.score is None:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Pendaftar jalur TIU wajib menyelesaikan ujian TIU "
                            "terlebih dahulu sebelum memilih jadwal sesi Tahfidz."
                        ),
                    )
            self.repo.update_selection_result_session(
                app.id, session_id, now, session_type="tahfidz"
            )

        self.repo.db.commit()

        # Notifikasi ke pendaftar: jadwal terkonfirmasi (Fase 3 spec)
        try:
            from src.core.config import settings

            location_or_link = session.meeting_url or session.location or "-"
            send_notifications(
                [
                    (
                        "session_confirmed",
                        {
                            "nama_ujian": session.name,
                            "tanggal": str(session.session_date)
                            if session.session_date
                            else "-",
                            "jam_mulai": session.start_time or "-",
                            "jam_selesai": session.end_time or "-",
                            "lokasi_atau_link": location_or_link,
                            "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                        },
                    )
                ],
                app.user_id,
            )
        except Exception:
            import logging

            logging.getLogger("ptdarrahman.selection").exception(
                "session_confirmed notification failed; continuing"
            )

        # Notifikasi ke pembuat sesi (Admin / Evaluator)
        if session.created_by:
            try:
                creator_user = self.repo.get_user_by_id(session.created_by)
                if creator_user:
                    stype_label = (
                        "Ujian Tahfidz"
                        if "tahfidz" in (session.session_type or "").lower()
                        else "Wawancara"
                    )
                    send_notifications(
                        [
                            (
                                "officer_session_booked",
                                {
                                    "nama_petugas": creator_user.full_name
                                    or session.officer_name,
                                    "nama_sesi": session.name,
                                    "jenis_sesi": stype_label,
                                    "nama_pendaftar": app.full_name,
                                    "tanggal": str(session.session_date)
                                    if session.session_date
                                    else "-",
                                    "jam_mulai": session.start_time or "-",
                                    "jam_selesai": session.end_time or "selesai",
                                    "lokasi_atau_link": location_or_link,
                                },
                            )
                        ],
                        creator_user.id,
                    )
            except Exception:
                import logging

                logging.getLogger("ptdarrahman.selection").exception(
                    "officer_session_booked notification failed; continuing"
                )

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
