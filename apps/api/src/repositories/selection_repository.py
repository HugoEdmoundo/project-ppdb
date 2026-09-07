from collections.abc import Sequence
from datetime import date, datetime
from typing import Any, cast

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from src.models.ppdb import PPDBApplicant, PPDBWave
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

    def get_active_wave_id(self) -> str | None:
        stmt = select(PPDBWave.id).where(PPDBWave.status == "active").limit(1)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_sessions(self, wave_id: str) -> Sequence[tuple]:
        # Returns tuples of (SelectionSession, wave_name, booked_count)
        # Using raw values instead of complex relationships if not defined
        stmt = (
            select(
                SelectionSession,
                PPDBWave.name.label("wave_name"),
                select(func.count())
                .where(SelectionResult.session_id == SelectionSession.id)
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

    def create_session(self, session: SelectionSession) -> SelectionSession:
        self.db.add(session)
        self.db.flush()
        return session

    def get_session_by_id(self, session_id: str) -> SelectionSession | None:
        return self.db.get(SelectionSession, session_id)

    def get_session_with_booked_count(self, session_id: str) -> tuple | None:
        stmt = select(
            SelectionSession,
            select(func.count())
            .where(SelectionResult.session_id == SelectionSession.id)
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
        return self.db.scalars(stmt).all()

    def get_categories(self, wave_id: str) -> Sequence[SelectionCategory]:
        stmt = (
            select(SelectionCategory)
            .where(SelectionCategory.wave_id == wave_id)
            .order_by(SelectionCategory.created_at.asc())
        )
        return self.db.scalars(stmt).all()

    def get_criteria_by_category(self, category_id: str) -> Sequence[SelectionCriteria]:
        stmt = (
            select(SelectionCriteria)
            .where(SelectionCriteria.category_id == category_id)
            .order_by(SelectionCriteria.created_at.asc())
        )
        return self.db.scalars(stmt).all()

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
        stmt = (
            select(
                SelectionResult,
                PPDBApplicant,
                SelectionSession,
                PPDBWave.name.label("wave_name"),
            )
            .join(PPDBApplicant, SelectionResult.applicant_id == PPDBApplicant.id)
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
        return self.db.scalars(stmt).all()

    def get_applicant_by_id(self, applicant_id: str) -> PPDBApplicant | None:
        stmt = select(PPDBApplicant).where(
            PPDBApplicant.id == applicant_id, PPDBApplicant.deleted_at.is_(None)
        )
        return self.db.scalar(stmt)

    def get_applicant_by_user_id(self, user_id: str) -> PPDBApplicant | None:
        stmt = select(PPDBApplicant).where(PPDBApplicant.user_id == user_id).limit(1)
        return self.db.scalar(stmt)

    def get_selection_result_by_applicant(
        self, applicant_id: str
    ) -> SelectionResult | None:
        stmt = select(SelectionResult).where(
            SelectionResult.applicant_id == applicant_id
        )
        return self.db.scalar(stmt)

    def update_selection_result_notes(
        self, applicant_id: str, notes: str | None, now: datetime
    ):
        stmt = (
            update(SelectionResult)
            .where(SelectionResult.applicant_id == applicant_id)
            .values(notes=notes, updated_at=now)
        )
        self.db.execute(stmt)
        self.db.flush()

    def get_selection_score(
        self, applicant_id: str, criteria_id: str
    ) -> SelectionScore | None:
        stmt = select(SelectionScore).where(
            SelectionScore.applicant_id == applicant_id,
            SelectionScore.criteria_id == criteria_id,
        )
        return self.db.scalar(stmt)

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
        self, applicant_id: str, session_id: str, now: datetime
    ):
        stmt = (
            update(SelectionResult)
            .where(SelectionResult.applicant_id == applicant_id)
            .values(session_id=session_id, updated_at=now)
        )
        self.db.execute(stmt)
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
        return self.db.scalar(stmt)

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
        return self.db.scalars(stmt).all()

    def get_available_sessions(self, wave_id: str, today_iso: str) -> Sequence[tuple]:
        stmt = (
            select(
                SelectionSession,
                select(func.count())
                .where(SelectionResult.session_id == SelectionSession.id)
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
        return self.db.scalars(stmt).all()
