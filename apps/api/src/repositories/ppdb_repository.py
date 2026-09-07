from typing import Any, cast

from sqlalchemy import or_, text
from sqlalchemy.orm import Session

from src.models.auth import User
from src.models.ppdb import PPDBApplicant, PPDBPaymentTransaction, PPDBPeriod, PPDBWave


class PPDBRepository:
    def __init__(self, db: Session):
        self.db = db

    # -------------------------------------------------------------------------
    # Periods
    # -------------------------------------------------------------------------
    def get_periods_paginated(
        self, search: str, page: int, per_page: int
    ) -> tuple[list[dict[str, Any]], int]:
        # Using raw mapping or ORM?
        # Using ORM for periods and left outer join / subquery for wave count
        # In router.py it returns dicts, let's keep it simple with ORM.

        query = self.db.query(PPDBPeriod)
        if search:
            query = query.filter(PPDBPeriod.name.ilike(f"%{search}%"))

        total = query.count()
        periods = (
            query.order_by(PPDBPeriod.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )

        # calculate wave_count for each
        result = []
        for p in periods:
            wave_count = (
                self.db.query(PPDBWave).filter(PPDBWave.period_id == p.id).count()
            )
            p_dict = {
                "id": p.id,
                "name": p.name,
                "academic_year": p.academic_year,
                "description": p.description,
                "status": p.status,
                "created_at": p.created_at,
                "wave_count": wave_count,
            }
            result.append(p_dict)

        return result, total

    def get_all_periods(self) -> list[PPDBPeriod]:
        return self.db.query(PPDBPeriod).order_by(PPDBPeriod.created_at.desc()).all()

    def get_period_by_id(self, period_id: str) -> PPDBPeriod | None:
        return self.db.query(PPDBPeriod).filter(PPDBPeriod.id == period_id).first()

    def get_waves_by_period(self, period_id: str) -> list[PPDBWave]:
        return (
            self.db.query(PPDBWave)
            .filter(PPDBWave.period_id == period_id)
            .order_by(PPDBWave.wave_number.asc())
            .all()
        )

    def create_period(self, period: PPDBPeriod) -> PPDBPeriod:
        self.db.add(period)
        self.db.commit()
        self.db.refresh(period)
        return period

    def update_period(self, period: PPDBPeriod) -> PPDBPeriod:
        self.db.commit()
        self.db.refresh(period)
        return period

    def set_all_periods_inactive(self):
        self.db.query(PPDBPeriod).update({"status": "inactive"})
        self.db.query(PPDBWave).update({"status": "inactive"})

    def activate_period(self, period_id: str):
        self.db.query(PPDBPeriod).filter(PPDBPeriod.id == period_id).update(
            {"status": "active"}
        )
        self.db.commit()

    def deactivate_period(self, period_id: str):
        self.db.query(PPDBPeriod).filter(PPDBPeriod.id == period_id).update(
            {"status": "inactive"}
        )
        self.db.query(PPDBWave).filter(PPDBWave.period_id == period_id).update(
            {"status": "inactive"}
        )
        self.db.commit()

    def delete_period(self, period: PPDBPeriod):
        self.db.delete(period)
        self.db.commit()

    # -------------------------------------------------------------------------
    # Waves
    # -------------------------------------------------------------------------
    def get_waves(self, period_id: str | None = None) -> list[PPDBWave]:
        query = self.db.query(PPDBWave)
        if period_id:
            query = query.filter(PPDBWave.period_id == period_id)
        return query.order_by(
            PPDBWave.registration_start_date.asc(), PPDBWave.wave_number.asc()
        ).all()

    def get_active_wave(self) -> PPDBWave | None:
        return self.db.query(PPDBWave).filter(PPDBWave.status == "active").first()

    def get_wave_by_id(self, wave_id: str) -> PPDBWave | None:
        return self.db.query(PPDBWave).filter(PPDBWave.id == wave_id).first()

    def get_max_wave_number(self, period_id: str) -> int:
        from sqlalchemy import func

        max_num = (
            self.db.query(func.max(PPDBWave.wave_number))
            .filter(PPDBWave.period_id == period_id)
            .scalar()
        )
        return cast(int, max_num) if max_num is not None else 0

    def create_wave(self, wave: PPDBWave) -> PPDBWave:
        self.db.add(wave)
        self.db.commit()
        self.db.refresh(wave)
        return wave

    def update_wave(self, wave: PPDBWave) -> PPDBWave:
        self.db.commit()
        self.db.refresh(wave)
        return wave

    def set_all_waves_inactive(self):
        self.db.query(PPDBWave).update({"status": "inactive"})

    def activate_wave(self, wave_id: str):
        self.db.query(PPDBWave).filter(PPDBWave.id == wave_id).update(
            {"status": "active"}
        )
        self.db.commit()

    def deactivate_wave(self, wave_id: str):
        self.db.query(PPDBWave).filter(PPDBWave.id == wave_id).update(
            {"status": "inactive"}
        )
        self.db.commit()

    def delete_wave(self, wave: PPDBWave):
        self.db.delete(wave)
        self.db.commit()

    # -------------------------------------------------------------------------
    # Registration & Applicants
    # -------------------------------------------------------------------------
    def get_role_id_by_name(self, role_name: str) -> str | None:
        result = self.db.execute(
            text("SELECT id FROM roles WHERE name = :name LIMIT 1"), {"name": role_name}
        ).scalar()
        return result

    def get_user_by_username(self, username: str) -> User | None:
        return self.db.query(User).filter(User.username == username).first()

    def get_user_by_id(self, user_id: str) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_user_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def get_applicant_by_email_active(self, email: str) -> PPDBApplicant | None:
        return (
            self.db.query(PPDBApplicant)
            .filter(PPDBApplicant.email == email, PPDBApplicant.status != "expired")
            .first()
        )

    def get_applicant_by_id(self, applicant_id: str) -> PPDBApplicant | None:
        return (
            self.db.query(PPDBApplicant)
            .filter(PPDBApplicant.id == applicant_id)
            .first()
        )

    def create_user_and_applicant(
        self, user: User, applicant: PPDBApplicant, transaction: PPDBPaymentTransaction
    ) -> tuple[User, PPDBApplicant]:
        self.db.add(user)
        self.db.add(applicant)
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(user)
        self.db.refresh(applicant)
        return user, applicant

    def get_applicants_paginated(
        self, wave_id: str, search: str, status: str | None, page: int, per_page: int
    ) -> tuple[list[dict[str, Any]], int]:
        query = (
            self.db.query(
                PPDBApplicant, PPDBWave.name.label("wave_name"), User.username
            )
            .outerjoin(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .outerjoin(User, PPDBApplicant.user_id == User.id)
            .filter(PPDBApplicant.wave_id == wave_id)
        )

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    PPDBApplicant.full_name.ilike(search_term),
                    PPDBApplicant.email.ilike(search_term),
                    PPDBApplicant.province.ilike(search_term),
                    PPDBApplicant.city.ilike(search_term),
                    PPDBApplicant.district.ilike(search_term),
                    PPDBApplicant.village.ilike(search_term),
                )
            )

        if status:
            query = query.filter(PPDBApplicant.status == status)

        total = query.count()
        rows = (
            query.order_by(PPDBApplicant.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )

        result = []
        for app, wave_name, username in rows:
            # map to dict
            app_dict = {c.name: getattr(app, c.name) for c in app.__table__.columns}
            app_dict["wave_name"] = wave_name
            app_dict["username"] = username
            result.append(app_dict)

        return result, total

    def update_user_password(self, user: User, password_hash: str):
        user.password_hash = password_hash
        user.failed_login_attempts = 0
        user.locked_until = None
        self.db.commit()

    # -------------------------------------------------------------------------
    # Dashboard & Cron
    # -------------------------------------------------------------------------
    def count_periods(self) -> int:
        return self.db.query(PPDBPeriod).count()

    def count_waves(self) -> int:
        return self.db.query(PPDBWave).count()

    def get_active_period_name(self) -> str | None:
        period = self.db.query(PPDBPeriod).filter(PPDBPeriod.status == "active").first()
        return period.name if period else None

    def get_expired_pending_applicants(
        self, limit_time_str: str
    ) -> list[PPDBApplicant]:
        return (
            self.db.query(PPDBApplicant)
            .filter(
                PPDBApplicant.payment_status == "pending",
                PPDBApplicant.payment_deadline <= limit_time_str,
                PPDBApplicant.deleted_at.is_(None),
            )
            .all()
        )

    def soft_delete_applicants(self, applicants: list[PPDBApplicant], now_str: str):
        app_ids = [a.id for a in applicants]
        user_ids = [a.user_id for a in applicants]

        self.db.query(PPDBApplicant).filter(PPDBApplicant.id.in_(app_ids)).update(
            {"deleted_at": now_str, "payment_status": "expired", "status": "expired"},
            synchronize_session=False,
        )

        if user_ids:
            self.db.query(User).filter(User.id.in_(user_ids)).update(
                {"is_active": False}, synchronize_session=False
            )

        self.db.query(PPDBPaymentTransaction).filter(
            PPDBPaymentTransaction.applicant_id.in_(app_ids),
            PPDBPaymentTransaction.status == "pending",
        ).update(
            {"status": "expired", "updated_at": now_str}, synchronize_session=False
        )

        self.db.commit()

    def get_applicants_for_payment_reminder(
        self, now_str: str, tomorrow_str: str
    ) -> list[PPDBApplicant]:
        return (
            self.db.query(PPDBApplicant)
            .filter(
                PPDBApplicant.payment_status == "pending",
                PPDBApplicant.payment_deadline > now_str,
                PPDBApplicant.payment_deadline <= tomorrow_str,
                PPDBApplicant.deleted_at.is_(None),
            )
            .all()
        )

    def get_applicants_for_document_reminder(
        self,
    ) -> list[tuple[PPDBApplicant, PPDBWave]]:
        return cast(
            list[tuple[PPDBApplicant, PPDBWave]],
            self.db.query(PPDBApplicant, PPDBWave)
            .join(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .filter(
                PPDBApplicant.status.in_(
                    ["document_uploaded_pending", "document_rejected"]
                ),
                PPDBWave.document_upload_end_date.is_not(None),
                PPDBApplicant.deleted_at.is_(None),
            )
            .all(),
        )

    def get_applicants_for_selection_reminder(
        self,
    ) -> list[tuple[PPDBApplicant, PPDBWave]]:
        return cast(
            list[tuple[PPDBApplicant, PPDBWave]],
            self.db.query(PPDBApplicant, PPDBWave)
            .join(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .filter(
                PPDBApplicant.status == "selection",
                PPDBWave.selection_date.is_not(None),
                PPDBApplicant.deleted_at.is_(None),
            )
            .all(),
        )
