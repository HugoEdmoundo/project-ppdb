from collections.abc import Sequence
from datetime import date, datetime
from typing import Any, cast
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session

from src.models.auth import User
from src.models.ppdb import PPDBApplicant, PPDBWave, TIUResult
from src.models.selection import (
    SelectionCategory,
    SelectionCriteria,
    SelectionResult,
    SelectionScore,
    SelectionSession,
)


class SelectionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_id(self, user_id: str) -> User | None:
        return cast(User | None, self.db.get(User, user_id))

    def get_active_wave_id(self) -> str | None:
        stmt = select(PPDBWave.id).where(PPDBWave.status == "active").limit(1)
        return cast(str | None, self.db.execute(stmt).scalar_one_or_none())

    def cleanup_expired_unbooked_sessions(self, wave_id: str | None = None) -> int:
        """Hapus otomatis sesi yang belum di-booking sampai waktu pelaksanaan.

        Sesi yang tidak diambil pendaftar (booked_count == 0) saat jadwalnya sudah
        terlewati (hari sebelumnya ATAU hari ini tapi jam mulai sudah lewat)
        otomatis dihapus permanen dari sistem (DB & frontend).
        """
        wib = ZoneInfo("Asia/Jakarta")
        now_wib = datetime.now(wib)
        today = now_wib.date()
        current_time = now_wib.strftime("%H:%M")

        # Subquery ID sesi yang sudah di-take pendaftar
        booked_subq = (
            select(SelectionResult.session_id)
            .where(SelectionResult.session_id.isnot(None))
            .union(
                select(SelectionResult.interview_session_id).where(
                    SelectionResult.interview_session_id.isnot(None)
                )
            )
        )

        stmt = select(SelectionSession.id).where(
            SelectionSession.session_date.isnot(None),
            SelectionSession.id.notin_(booked_subq),
            or_(
                SelectionSession.session_date < today,
                (
                    (SelectionSession.session_date == today)
                    & (SelectionSession.start_time <= current_time)
                ),
            ),
        )
        if wave_id:
            stmt = stmt.where(SelectionSession.wave_id == wave_id)

        expired_ids = list(self.db.scalars(stmt).all())
        if expired_ids:
            del_stmt = delete(SelectionSession).where(
                SelectionSession.id.in_(expired_ids)
            )
            self.db.execute(del_stmt)
            self.db.flush()
        return len(expired_ids)

    def get_sessions(self, wave_id: str) -> Sequence[tuple]:
        # Returns tuples of (SelectionSession, wave_name, booked_count)
        self.cleanup_expired_unbooked_sessions(wave_id)
        stmt = (
            select(
                SelectionSession,
                PPDBWave.name.label("wave_name"),
                select(func.count())
                .where(
                    or_(
                        SelectionResult.session_id == SelectionSession.id,
                        SelectionResult.interview_session_id == SelectionSession.id,
                    )
                )
                .scalar_subquery()
                .label("booked_count"),
            )
            .outerjoin(PPDBWave, SelectionSession.wave_id == PPDBWave.id)
            .where(SelectionSession.wave_id == wave_id)
            .order_by(
                SelectionSession.session_date.asc(), SelectionSession.start_time.asc()
            )
        )
        return cast(Sequence[tuple[Any, ...]], self.db.execute(stmt).all())

    def get_sessions_with_booking_details(
        self, wave_id: str, session_type: str | None = None
    ) -> list[dict[str, Any]]:
        """List sesi dengan info status warna (merah/kuning/hijau),
        data pendaftar booking, dan skor evaluasi."""
        self.cleanup_expired_unbooked_sessions(wave_id)

        stmt = (
            select(SelectionSession, PPDBWave.name.label("wave_name"))
            .outerjoin(PPDBWave, SelectionSession.wave_id == PPDBWave.id)
            .where(SelectionSession.wave_id == wave_id)
        )
        if session_type:
            stmt = stmt.where(SelectionSession.session_type == session_type)
        stmt = stmt.order_by(
            SelectionSession.session_date.asc(), SelectionSession.start_time.asc()
        )
        session_rows = self.db.execute(stmt).all()
        if not session_rows:
            return []

        # Ambil pendaftar yang mengambil sesi di gelombang ini
        bookings_stmt = (
            select(
                SelectionResult,
                PPDBApplicant.id.label("app_id"),
                PPDBApplicant.full_name.label("app_name"),
                PPDBApplicant.phone.label("app_phone"),
                PPDBApplicant.nisn.label("app_nisn"),
                PPDBApplicant.registration_path.label("app_path"),
                PPDBApplicant.status.label("app_status"),
            )
            .join(PPDBApplicant, SelectionResult.applicant_id == PPDBApplicant.id)
            .where(PPDBApplicant.wave_id == wave_id)
        )
        booking_rows = self.db.execute(bookings_stmt).all()

        session_bookings: dict[str, dict[str, Any]] = {}
        applicant_ids_booked: set[str] = set()
        for b_row in booking_rows:
            res, app_id, app_name, app_phone, app_nisn, app_path, app_status = b_row
            app_dict = {
                "id": app_id,
                "full_name": app_name,
                "phone": app_phone,
                "nisn": app_nisn,
                "registration_path": app_path,
                "status": app_status,
                "notes": res.notes,
            }
            if res.session_id:
                session_bookings[res.session_id] = app_dict
                applicant_ids_booked.add(app_id)
            if hasattr(res, "interview_session_id") and res.interview_session_id:
                session_bookings[res.interview_session_id] = app_dict
                applicant_ids_booked.add(app_id)

        # Cek apakah pendaftar sudah dinilai untuk kategori sesi terkait
        evaluated_map: dict[tuple[str, str], tuple[bool, float | None]] = {}
        if applicant_ids_booked:
            scores_stmt = (
                select(
                    SelectionScore.applicant_id,
                    SelectionScore.score,
                    SelectionCategory.name.label("category_name"),
                )
                .join(
                    SelectionCriteria,
                    SelectionScore.criteria_id == SelectionCriteria.id,
                )
                .join(
                    SelectionCategory,
                    SelectionCriteria.category_id == SelectionCategory.id,
                )
                .where(SelectionScore.applicant_id.in_(applicant_ids_booked))
            )
            score_rows = self.db.execute(scores_stmt).all()
            temp_scores: dict[tuple[str, str], list[float]] = {}
            for s_app_id, sc, cat_name in score_rows:
                stype_key = (
                    "tahfidz" if "tahfidz" in (cat_name or "").lower() else "interview"
                )
                key = (s_app_id, stype_key)
                if key not in temp_scores:
                    temp_scores[key] = []
                if sc is not None:
                    temp_scores[key].append(float(sc))

            for key, score_list in temp_scores.items():
                if score_list:
                    avg = sum(score_list) / len(score_list)
                    evaluated_map[key] = (True, round(avg, 1))

        results = []
        for s_row, wave_name in session_rows:
            d = s_row.__dict__.copy()
            d.pop("_sa_instance_state", None)
            d["wave_name"] = wave_name
            stype = (s_row.session_type or "tahfidz").lower()
            stype_key = (
                "interview"
                if "wawancara" in stype or "interview" in stype
                else "tahfidz"
            )

            booked_app = session_bookings.get(s_row.id)
            if booked_app:
                d["booked_count"] = 1
                d["booked_applicant"] = booked_app
                is_eval, score_val = evaluated_map.get(
                    (booked_app["id"], stype_key), (False, None)
                )
                d["is_evaluated"] = is_eval
                d["evaluated_score"] = score_val
                # Kuning jika sudah diambil pendaftar tapi belum dinilai;
                # Hijau jika sudah dinilai
                d["status_color"] = "green" if is_eval else "yellow"
            else:
                d["booked_count"] = 0
                d["booked_applicant"] = None
                d["is_evaluated"] = False
                d["evaluated_score"] = None
                # Merah jika belum ada yang mengambil
                d["status_color"] = "red"

            results.append(d)

        return results

    def create_session(self, session: SelectionSession) -> SelectionSession:
        self.db.add(session)
        self.db.flush()
        return session

    def get_session_by_id(self, session_id: str) -> SelectionSession | None:
        return cast(SelectionSession | None, self.db.get(SelectionSession, session_id))

    def get_session_with_booked_count(self, session_id: str) -> tuple | None:
        stmt = select(
            SelectionSession,
            select(func.count())
            .where(
                or_(
                    SelectionResult.session_id == SelectionSession.id,
                    SelectionResult.interview_session_id == SelectionSession.id,
                )
            )
            .scalar_subquery()
            .label("booked_count"),
        ).where(SelectionSession.id == session_id)
        return cast(tuple[Any, ...] | None, self.db.execute(stmt).first())

    def update_session(self, session: SelectionSession) -> SelectionSession:
        self.db.add(session)
        self.db.flush()
        return session

    def delete_session(self, session_id: str):
        # Set session_id to NULL in selection_results
        stmt_res = (
            update(SelectionResult)
            .where(SelectionResult.session_id == session_id)
            .values(session_id=None)
        )
        self.db.execute(stmt_res)

        stmt_del = delete(SelectionSession).where(SelectionSession.id == session_id)
        self.db.execute(stmt_del)
        self.db.flush()

    def get_applicants_in_session(self, session_id: str) -> Sequence[PPDBApplicant]:
        stmt = (
            select(PPDBApplicant)
            .join(SelectionResult, SelectionResult.applicant_id == PPDBApplicant.id)
            .where(SelectionResult.session_id == session_id)
        )
        return cast(Sequence[PPDBApplicant], self.db.scalars(stmt).all())

    def get_categories(self, wave_id: str) -> Sequence[SelectionCategory]:
        stmt = (
            select(SelectionCategory)
            .where(SelectionCategory.wave_id == wave_id)
            .order_by(SelectionCategory.created_at.asc())
        )
        return cast(Sequence[SelectionCategory], self.db.scalars(stmt).all())

    def get_criteria_by_category(self, category_id: str) -> Sequence[SelectionCriteria]:
        stmt = (
            select(SelectionCriteria)
            .where(SelectionCriteria.category_id == category_id)
            .order_by(SelectionCriteria.created_at.asc())
        )
        return cast(Sequence[SelectionCriteria], self.db.scalars(stmt).all())

    def get_category_by_id(self, category_id: str) -> SelectionCategory | None:
        stmt = select(SelectionCategory).where(SelectionCategory.id == category_id)
        return cast(SelectionCategory | None, self.db.scalar(stmt))

    def get_criteria_by_id(self, criteria_id: str) -> SelectionCriteria | None:
        stmt = select(SelectionCriteria).where(SelectionCriteria.id == criteria_id)
        return cast(SelectionCriteria | None, self.db.scalar(stmt))

    def get_active_wave_info(self) -> dict[str, Any] | None:
        stmt = (
            select(PPDBWave.id, PPDBWave.name)
            .where(PPDBWave.status == "active")
            .limit(1)
        )
        row = self.db.execute(stmt).first()
        if not row:
            return None
        return {"id": row[0], "name": row[1]}

    def ensure_selection_result(
        self, applicant_id: str, now: datetime
    ) -> SelectionResult:
        """Ambil baris hasil seleksi pendaftar, buat jika belum ada.

        Tanpa ini, UPDATE notes/session menyentuh 0 baris dan booking
        terlihat sukses padahal tidak tersimpan.
        """
        existing = self.get_selection_result_by_applicant(applicant_id)
        if existing:
            return existing
        row = SelectionResult(
            id=str(uuid4()),
            applicant_id=applicant_id,
            session_id=None,
            score=None,
            notes=None,
            graduation_status=None,
            graduation_notes=None,
            created_at=now,
            updated_at=now,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def create_category(self, category: SelectionCategory) -> SelectionCategory:
        self.db.add(category)
        self.db.flush()
        return category

    def create_criteria(self, criteria: SelectionCriteria) -> SelectionCriteria:
        self.db.add(criteria)
        self.db.flush()
        return criteria

    def delete_category(self, category_id: str):
        # Delete scores for criteria in this category
        subq = select(SelectionCriteria.id).where(
            SelectionCriteria.category_id == category_id
        )
        stmt_scores = delete(SelectionScore).where(SelectionScore.criteria_id.in_(subq))
        self.db.execute(stmt_scores)

        # Delete criteria
        stmt_crit = delete(SelectionCriteria).where(
            SelectionCriteria.category_id == category_id
        )
        self.db.execute(stmt_crit)

        # Delete category
        stmt_cat = delete(SelectionCategory).where(SelectionCategory.id == category_id)
        self.db.execute(stmt_cat)
        self.db.flush()

    def delete_criteria(self, criteria_id: str):
        stmt_scores = delete(SelectionScore).where(
            SelectionScore.criteria_id == criteria_id
        )
        self.db.execute(stmt_scores)

        stmt_crit = delete(SelectionCriteria).where(SelectionCriteria.id == criteria_id)
        self.db.execute(stmt_crit)
        self.db.flush()

    def get_results(self, wave_id: str) -> Sequence[tuple]:
        # Mulai dari pendaftar (LEFT JOIN hasil) agar pendaftar yang belum
        # punya baris selection_results tetap muncul di list admin.
        stmt = (
            select(
                SelectionResult,
                PPDBApplicant,
                SelectionSession,
                PPDBWave.name.label("wave_name"),
            )
            .select_from(PPDBApplicant)
            .outerjoin(
                SelectionResult, SelectionResult.applicant_id == PPDBApplicant.id
            )
            .outerjoin(
                SelectionSession, SelectionResult.session_id == SelectionSession.id
            )
            .outerjoin(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .where(PPDBApplicant.wave_id == wave_id)
            .order_by(PPDBApplicant.full_name.asc())
        )
        return cast(Sequence[tuple[Any, ...]], self.db.execute(stmt).all())

    def get_applicant_scores(self, applicant_id: str) -> Sequence[SelectionScore]:
        stmt = select(SelectionScore).where(SelectionScore.applicant_id == applicant_id)
        return cast(Sequence[SelectionScore], self.db.scalars(stmt).all())

    def get_applicant_by_id(self, applicant_id: str) -> PPDBApplicant | None:
        stmt = select(PPDBApplicant).where(
            PPDBApplicant.id == applicant_id, PPDBApplicant.deleted_at.is_(None)
        )
        return cast(PPDBApplicant | None, self.db.scalar(stmt))

    def get_applicant_by_user_id(self, user_id: str) -> PPDBApplicant | None:
        stmt = select(PPDBApplicant).where(PPDBApplicant.user_id == user_id).limit(1)
        return cast(PPDBApplicant | None, self.db.scalar(stmt))

    def get_selection_result_by_applicant(
        self, applicant_id: str
    ) -> SelectionResult | None:
        stmt = select(SelectionResult).where(
            SelectionResult.applicant_id == applicant_id
        )
        return cast(SelectionResult | None, self.db.scalar(stmt))

    def update_selection_result_notes(
        self, applicant_id: str, notes: str | None, now: datetime
    ):
        row = self.ensure_selection_result(applicant_id, now)
        row.notes = notes
        row.updated_at = now
        self.db.add(row)
        self.db.flush()

    def get_selection_score(
        self, applicant_id: str, criteria_id: str
    ) -> SelectionScore | None:
        stmt = select(SelectionScore).where(
            SelectionScore.applicant_id == applicant_id,
            SelectionScore.criteria_id == criteria_id,
        )
        return cast(SelectionScore | None, self.db.scalar(stmt))

    def add_selection_score(self, score: SelectionScore):
        self.db.add(score)
        self.db.flush()

    def update_selection_score(self, score: SelectionScore):
        self.db.add(score)
        self.db.flush()

    def update_applicant(self, applicant: PPDBApplicant):
        self.db.add(applicant)
        self.db.flush()

    def update_selection_result_session(
        self,
        applicant_id: str,
        session_id: str,
        now: datetime,
        session_type: str | None = None,
    ):
        row = self.ensure_selection_result(applicant_id, now)
        if (session_type or "").lower() == "wawancara":
            row.interview_session_id = session_id
        else:
            row.session_id = session_id
        row.updated_at = now
        self.db.add(row)
        self.db.flush()

    def get_applicant_scores_with_details(self, applicant_id: str) -> Sequence[tuple]:
        stmt = (
            select(
                SelectionScore.score,
                SelectionCriteria.name.label("criteria_name"),
                SelectionCategory.name.label("category_name"),
            )
            .join(SelectionCriteria, SelectionScore.criteria_id == SelectionCriteria.id)
            .join(
                SelectionCategory, SelectionCriteria.category_id == SelectionCategory.id
            )
            .where(SelectionScore.applicant_id == applicant_id)
            .order_by(SelectionCategory.created_at, SelectionCriteria.created_at)
        )
        return cast(Sequence[tuple[Any, ...]], self.db.execute(stmt).all())

    def get_earliest_session_date(self, wave_id: str, today_iso: str) -> date | None:
        stmt = (
            select(SelectionSession.session_date)
            .where(
                SelectionSession.wave_id == wave_id,
                SelectionSession.session_date.isnot(None),
                SelectionSession.session_date >= today_iso,
            )
            .order_by(SelectionSession.session_date.asc())
            .limit(1)
        )
        return cast(date | None, self.db.scalar(stmt))

    def get_unassigned_applicants(self, wave_id: str) -> Sequence[str]:
        stmt = (
            select(SelectionResult.applicant_id)
            .join(PPDBApplicant, SelectionResult.applicant_id == PPDBApplicant.id)
            .where(
                PPDBApplicant.wave_id == wave_id,
                SelectionResult.session_id.is_(None),
                PPDBApplicant.status == "selection",
            )
        )
        return cast(Sequence[str], self.db.scalars(stmt).all())

    def get_available_sessions(self, wave_id: str, today_iso: str) -> Sequence[tuple]:
        stmt = (
            select(
                SelectionSession,
                select(func.count())
                .where(
                    or_(
                        SelectionResult.session_id == SelectionSession.id,
                        SelectionResult.interview_session_id == SelectionSession.id,
                    )
                )
                .scalar_subquery()
                .label("booked_count"),
            )
            .where(
                SelectionSession.wave_id == wave_id,
                (SelectionSession.session_date >= today_iso)
                | (SelectionSession.session_date.is_(None)),
            )
            .order_by(
                SelectionSession.session_date.asc(), SelectionSession.start_time.asc()
            )
        )
        return cast(Sequence[tuple[Any, ...]], self.db.execute(stmt).all())

    def get_sessions_by_date(
        self, wave_id: str, target_date: str
    ) -> Sequence[SelectionSession]:
        stmt = select(SelectionSession).where(
            SelectionSession.wave_id == wave_id,
            SelectionSession.session_date == target_date,
        )
        return cast(Sequence[SelectionSession], self.db.scalars(stmt).all())

    def get_tiu_result_by_applicant(self, applicant_id: str) -> TIUResult | None:
        stmt = select(TIUResult).where(TIUResult.applicant_id == applicant_id)
        return cast(TIUResult | None, self.db.execute(stmt).scalars().first())
