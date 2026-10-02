from datetime import date, datetime, timedelta
from typing import Any, cast

from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

from src.models.auth import User
from src.models.ppdb import (
    PPDBBMOU,
    FileUpload,
    PPDBApplicant,
    PPDBApplicantDiscount,
    PPDBPaymentTransaction,
    PPDBPeriod,
    PPDBStage2Bill,
    PPDBWave,
    PPDBWaveFeeItem,
)


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
        return cast(
            list[PPDBPeriod],
            self.db.query(PPDBPeriod).order_by(PPDBPeriod.created_at.desc()).all(),
        )

    def get_period_by_id(self, period_id: str) -> PPDBPeriod | None:
        return cast(
            PPDBPeriod | None,
            self.db.query(PPDBPeriod).filter(PPDBPeriod.id == period_id).first(),
        )

    def get_waves_by_period(self, period_id: str) -> list[PPDBWave]:
        return cast(
            list[PPDBWave],
            self.db.query(PPDBWave)
            .filter(PPDBWave.period_id == period_id)
            .order_by(PPDBWave.wave_number.asc())
            .all(),
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

    def activate_period(self, period_id: str):
        # Keep any active wave inside the selected period, but turn off every
        # period and wave outside it. Run the changes in one transaction so the
        # public registration lookup never sees a half-switched period.
        self.db.query(PPDBPeriod).filter(PPDBPeriod.id != period_id).update(
            {"status": "inactive"}, synchronize_session=False
        )
        self.db.query(PPDBWave).filter(PPDBWave.period_id != period_id).update(
            {"status": "inactive"}, synchronize_session=False
        )
        self.db.query(PPDBPeriod).filter(PPDBPeriod.id == period_id).update(
            {"status": "active"}, synchronize_session=False
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
        return cast(
            list[PPDBWave],
            query.order_by(
                PPDBWave.registration_start_date.asc(), PPDBWave.wave_number.asc()
            ).all(),
        )

    def get_active_wave(self) -> PPDBWave | None:
        return cast(
            PPDBWave | None,
            self.db.query(PPDBWave)
            .join(PPDBPeriod, PPDBPeriod.id == PPDBWave.period_id)
            .filter(PPDBWave.status == "active", PPDBPeriod.status == "active")
            .order_by(
                PPDBWave.registration_start_date.asc(), PPDBWave.wave_number.asc()
            )
            .first(),
        )

    def get_wave_by_id(self, wave_id: str) -> PPDBWave | None:
        return cast(
            PPDBWave | None,
            self.db.query(PPDBWave).filter(PPDBWave.id == wave_id).first(),
        )

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

    def activate_wave(self, wave_id: str, period_id: str):
        # Wave activation is scoped to its parent period. Other periods are
        # already inactive when their parent period is switched off.
        self.db.query(PPDBWave).filter(
            PPDBWave.period_id == period_id, PPDBWave.id != wave_id
        ).update({"status": "inactive"}, synchronize_session=False)
        self.db.query(PPDBWave).filter(PPDBWave.id == wave_id).update(
            {"status": "active"}, synchronize_session=False
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
    # Wave fee items (Biaya Tahap 2 per gelombang)
    # -------------------------------------------------------------------------
    def get_fee_items_by_wave(self, wave_id: str) -> list[PPDBWaveFeeItem]:
        return cast(
            list[PPDBWaveFeeItem],
            self.db.query(PPDBWaveFeeItem)
            .filter(PPDBWaveFeeItem.wave_id == wave_id)
            .order_by(
                PPDBWaveFeeItem.order_index.asc(), PPDBWaveFeeItem.created_at.asc()
            )
            .all(),
        )

    def get_fee_item(self, item_id: str) -> PPDBWaveFeeItem | None:
        return cast(
            PPDBWaveFeeItem | None,
            self.db.query(PPDBWaveFeeItem)
            .filter(PPDBWaveFeeItem.id == item_id)
            .first(),
        )

    def create_fee_item(self, item: PPDBWaveFeeItem) -> PPDBWaveFeeItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update_fee_item(self, item: PPDBWaveFeeItem) -> PPDBWaveFeeItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_fee_item(self, item: PPDBWaveFeeItem):
        self.db.delete(item)
        self.db.commit()

    def count_discounts_for_fee_item(self, fee_item_id: str) -> int:
        return cast(
            int,
            (
                self.db.query(PPDBApplicantDiscount)
                .filter(PPDBApplicantDiscount.fee_item_id == fee_item_id)
                .count()
            ),
        )

    def count_bills_for_fee_item(self, fee_item_id: str) -> int:
        return cast(
            int,
            (
                self.db.query(PPDBStage2Bill)
                .filter(PPDBStage2Bill.fee_item_id == fee_item_id)
                .count()
            ),
        )

    def update_mou(self, mou: PPDBBMOU) -> PPDBBMOU:
        self.db.commit()
        self.db.refresh(mou)
        return mou

    # -------------------------------------------------------------------------
    # Registration & Applicants
    # -------------------------------------------------------------------------
    def get_role_id_by_name(self, role_name: str) -> str | None:
        result = self.db.execute(
            text("SELECT id FROM roles WHERE name = :name LIMIT 1"), {"name": role_name}
        ).scalar()
        return cast(str | None, result)

    def get_user_by_username(self, username: str) -> User | None:
        return cast(
            User | None, self.db.query(User).filter(User.username == username).first()
        )

    def get_user_by_id(self, user_id: str) -> User | None:
        return cast(User | None, self.db.query(User).filter(User.id == user_id).first())

    def get_user_by_email(self, email: str) -> User | None:
        return cast(
            User | None, self.db.query(User).filter(User.email == email).first()
        )

    def get_applicant_by_email_active(self, email: str) -> PPDBApplicant | None:
        return cast(
            PPDBApplicant | None,
            self.db.query(PPDBApplicant)
            .filter(PPDBApplicant.email == email, PPDBApplicant.status != "expired")
            .first(),
        )

    def get_applicant_by_id(self, applicant_id: str) -> PPDBApplicant | None:
        return cast(
            PPDBApplicant | None,
            self.db.query(PPDBApplicant)
            .filter(PPDBApplicant.id == applicant_id)
            .first(),
        )

    def update_applicant(self, applicant: PPDBApplicant) -> PPDBApplicant:
        self.db.commit()
        self.db.refresh(applicant)
        return applicant

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
        self,
        wave_id: str | None,
        search: str,
        status: str | None,
        page: int,
        per_page: int,
        period_id: str | None = None,
        payment_status: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """Daftar pendaftar lintas periode/gelombang.

        ``wave_id`` dan ``period_id`` bersifat opsional: bila keduanya None,
        seluruh pendaftar dari semua periode & gelombang dikembalikan (dipakai
        Superadmin). Baris selalu membawa ``wave_name``/``period_name`` sebagai
        label asal pendaftar.
        """
        query = (
            self.db.query(
                PPDBApplicant,
                PPDBWave.name.label("wave_name"),
                PPDBWave.id.label("wave_id_joined"),
                PPDBPeriod.id.label("period_id_joined"),
                PPDBPeriod.name.label("period_name"),
                User.username,
            )
            .outerjoin(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .outerjoin(PPDBPeriod, PPDBWave.period_id == PPDBPeriod.id)
            .outerjoin(User, PPDBApplicant.user_id == User.id)
        )

        if wave_id:
            query = query.filter(PPDBApplicant.wave_id == wave_id)
        if period_id:
            query = query.filter(PPDBWave.period_id == period_id)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    PPDBApplicant.full_name.ilike(search_term),
                    PPDBApplicant.email.ilike(search_term),
                    PPDBApplicant.phone.ilike(search_term),
                    PPDBApplicant.nisn.ilike(search_term),
                    PPDBApplicant.nik.ilike(search_term),
                    PPDBApplicant.province.ilike(search_term),
                    PPDBApplicant.city.ilike(search_term),
                    PPDBApplicant.district.ilike(search_term),
                    PPDBApplicant.village.ilike(search_term),
                )
            )

        if status:
            query = query.filter(PPDBApplicant.status == status)

        if payment_status:
            query = query.filter(PPDBApplicant.payment_status == payment_status)

        total = query.count()
        rows = (
            query.order_by(PPDBApplicant.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )

        result = []
        for (
            app,
            wave_name,
            wave_id_joined,
            period_id_joined,
            period_name,
            username,
        ) in rows:
            # map to dict
            app_dict = {c.name: getattr(app, c.name) for c in app.__table__.columns}
            app_dict["wave_name"] = wave_name
            app_dict["wave_id"] = wave_id_joined
            app_dict["period_id"] = period_id_joined
            app_dict["period_name"] = period_name
            app_dict["username"] = username
            result.append(app_dict)

        return result, total

    def get_applicant_detail(self, applicant_id: str) -> dict[str, Any] | None:
        """Detail satu pendaftar lengkap dengan label periode & gelombang."""
        row = (
            self.db.query(
                PPDBApplicant,
                PPDBWave.name.label("wave_name"),
                PPDBPeriod.id.label("period_id_joined"),
                PPDBPeriod.name.label("period_name"),
                User.username,
            )
            .outerjoin(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .outerjoin(PPDBPeriod, PPDBWave.period_id == PPDBPeriod.id)
            .outerjoin(User, PPDBApplicant.user_id == User.id)
            .filter(PPDBApplicant.id == applicant_id)
            .first()
        )
        if not row:
            return None

        app, wave_name, period_id, period_name, username = row
        detail: dict[str, Any] = {
            c.name: getattr(app, c.name) for c in app.__table__.columns
        }
        detail["wave_name"] = wave_name
        detail["period_id"] = period_id
        detail["period_name"] = period_name
        detail["username"] = username
        return detail

    def delete_applicant_permanent(self, applicant: PPDBApplicant) -> None:
        """Hapus permanen pendaftar beserta akun login dan seluruh data turunannya.

        Dipakai Superadmin (keputusan bisnis: hapus = permanen, bukan soft delete).
        Semua penghapusan dalam SATU transaksi: bila salah satu gagal, tidak ada
        data yang hilang sebagian (mis. akun terhapus tapi nilai seleksi tertinggal).
        """
        user_id = applicant.user_id

        # 1. Baris dokumen milik pendaftar ini. Dihapus eksplisit (bukan hanya
        #    andalkan CASCADE dari users) supaya physical file purge di service
        #    punya sumber yang jelas dan tidak bergantung pada ada/tidaknya FK
        #    di database produksi. Unggahan lain milik user (mis. avatar)
        #    tetap ikut terhapus lewat CASCADE.
        self.db.query(FileUpload).filter(
            FileUpload.entity_type.like("ppdb_document:%"),
            FileUpload.entity_id == applicant.id,
        ).delete(synchronize_session=False)

        # 2. Data pembayaran & tagihan.
        self.db.query(PPDBPaymentTransaction).filter(
            PPDBPaymentTransaction.applicant_id == applicant.id
        ).delete(synchronize_session=False)
        self.db.query(PPDBApplicantDiscount).filter(
            PPDBApplicantDiscount.applicant_id == applicant.id
        ).delete(synchronize_session=False)
        self.db.query(PPDBStage2Bill).filter(
            PPDBStage2Bill.applicant_id == applicant.id
        ).delete(synchronize_session=False)
        self.db.query(PPDBBMOU).filter(PPDBBMOU.applicant_id == applicant.id).delete(
            synchronize_session=False
        )

        # 3. Hasil & nilai seleksi. TIDAK punya FK ke ppdb_applicants, jadi tanpa
        #    baris di sini akan jadi data yatim yang tetap muncul di daftar hasil.
        self.db.execute(
            text("DELETE FROM `selection_results` WHERE `applicant_id` = :aid"),
            {"aid": applicant.id},
        )
        self.db.execute(
            text("DELETE FROM `selection_scores` WHERE `applicant_id` = :aid"),
            {"aid": applicant.id},
        )

        # 4. Baris pendaftar lalu akun login.
        #    audit_log & notification_logs tidak dihapus: keduanya FK-nya
        #    ON DELETE SET NULL, jadi riwayat tetap ada tanpa akun —
        #    sesuai kebutuhan "riwayat dapat ditelusuri".
        self.db.delete(applicant)
        if user_id:
            # refresh_tokens & user_page_permissions ber-CASCADE dari users.
            self.db.query(User).filter(User.id == user_id).delete(
                synchronize_session=False
            )

        self.db.commit()

    def get_applicant_document_files(self, applicant_id: str) -> list[str]:
        """List ``storage_path`` file upload milik satu pendaftar.

        Dipakai saat hapus permanen supaya file fisiknya ikut dibersihkan.
        """
        rows = (
            self.db.query(FileUpload)
            .filter(
                FileUpload.entity_type.like("ppdb_document:%"),
                FileUpload.entity_id == applicant_id,
            )
            .all()
        )
        return [r.storage_path for r in rows]

    def get_applicant_by_user_id(self, user_id: str) -> PPDBApplicant | None:
        return cast(
            PPDBApplicant | None,
            (
                self.db.query(PPDBApplicant)
                .filter(
                    PPDBApplicant.user_id == user_id,
                    PPDBApplicant.deleted_at.is_(None),
                )
                .first()
            ),
        )

    def get_applicant_documents(self, applicant_id: str) -> list[dict[str, Any]]:
        rows = (
            self.db.query(FileUpload)
            .filter(
                FileUpload.entity_type.like("ppdb_document:%"),
                FileUpload.entity_id == applicant_id,
            )
            .order_by(FileUpload.created_at.desc())
            .all()
        )
        return [
            {
                "id": r.id,
                "original_name": r.original_name,
                "mime_type": r.mime_type,
                "size_bytes": r.size_bytes,
                "public_url": r.public_url,
                "entity_type": r.entity_type,
                "doc_type": r.entity_type.split(":", 1)[1] if r.entity_type else None,
                "created_at": r.created_at,
            }
            for r in rows
        ]

    def replace_applicant_document(
        self,
        applicant_id: str,
        doc_type: str,
        upload: Any,
        file_id: str,
        uploaded_by: str,
        now: datetime,
    ) -> list[str]:
        """Simpan satu dokumen pendaftar. Dokumen lama sejenis dihapus dulu.

        Return list storage_path lama yang harus dihapus oleh pemanggil.
        """
        entity_type = f"ppdb_document:{doc_type}"
        old = (
            self.db.query(FileUpload)
            .filter(
                FileUpload.entity_type == entity_type,
                FileUpload.entity_id == applicant_id,
            )
            .all()
        )

        for o in old:
            self.db.delete(o)

        record = FileUpload(
            id=file_id,
            uploaded_by=uploaded_by,
            original_name=upload.original_name,
            stored_name=str(upload.storage_path).split("/")[-1],
            mime_type=upload.mime_type,
            size_bytes=upload.size_bytes,
            storage_path=upload.storage_path,
            public_url=upload.public_url,
            entity_type=entity_type,
            entity_id=applicant_id,
            data=upload.data,
            created_at=now,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return [o.storage_path for o in old]

    def update_user_password(self, user: User, password_hash: str):
        user.password_hash = password_hash
        user.failed_login_attempts = 0
        user.locked_until = None
        self.db.commit()

    # -------------------------------------------------------------------------
    # Dashboard & Cron
    # -------------------------------------------------------------------------
    def count_applicants_in_period(self, period_id: str) -> int:
        return cast(
            int,
            self.db.query(PPDBApplicant)
            .join(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .filter(PPDBWave.period_id == period_id)
            .count(),
        )

    def count_periods(self) -> int:
        return cast(int, self.db.query(PPDBPeriod).count())

    def count_waves(self) -> int:
        return cast(int, self.db.query(PPDBWave).count())

    def get_active_period_name(self) -> str | None:
        period = self.db.query(PPDBPeriod).filter(PPDBPeriod.status == "active").first()
        return period.name if period else None

    def count_applicants_in_wave(self, wave_id: str) -> int:
        """Total pendaftar di gelombang tertentu (ikut soft-deleted/expired,
        konsisten dengan GET /ppdb/applicants yang tetap menampilkan expired)."""
        return cast(
            int,
            (
                self.db.query(PPDBApplicant)
                .filter(PPDBApplicant.wave_id == wave_id)
                .count()
            ),
        )

    def count_paid_form_payments_in_wave(self, wave_id: str) -> int:
        """Count unique applicants with a successful form payment in a wave."""
        return cast(
            int,
            self.db.query(
                func.count(func.distinct(PPDBPaymentTransaction.applicant_id))
            )
            .join(
                PPDBApplicant,
                PPDBApplicant.id == PPDBPaymentTransaction.applicant_id,
            )
            .filter(
                PPDBApplicant.wave_id == wave_id,
                PPDBPaymentTransaction.status == "success",
            )
            .scalar()
            or 0,
        )

    def count_applicants_by_status_in_wave(self, wave_id: str) -> dict[str, int]:
        rows = (
            self.db.query(PPDBApplicant.status, func.count(PPDBApplicant.id))
            .filter(PPDBApplicant.wave_id == wave_id)
            .group_by(PPDBApplicant.status)
            .all()
        )
        return {status: count for status, count in rows}

    def count_payments_by_status_in_wave(self, wave_id: str) -> dict[str, int]:
        rows = (
            self.db.query(
                PPDBPaymentTransaction.status, func.count(PPDBPaymentTransaction.id)
            )
            .join(
                PPDBApplicant,
                PPDBPaymentTransaction.applicant_id == PPDBApplicant.id,
            )
            .filter(PPDBApplicant.wave_id == wave_id)
            .group_by(PPDBPaymentTransaction.status)
            .all()
        )
        return {status: count for status, count in rows}

    def count_payments_by_method_in_wave(
        self, wave_id: str
    ) -> dict[str, dict[str, int]]:
        rows = (
            self.db.query(
                PPDBPaymentTransaction.method,
                PPDBPaymentTransaction.status,
                func.count(PPDBPaymentTransaction.id),
            )
            .join(
                PPDBApplicant,
                PPDBPaymentTransaction.applicant_id == PPDBApplicant.id,
            )
            .filter(PPDBApplicant.wave_id == wave_id)
            .group_by(PPDBPaymentTransaction.method, PPDBPaymentTransaction.status)
            .all()
        )
        result: dict[str, dict[str, int]] = {}
        for method, status, count in rows:
            result.setdefault(method, {})[status] = count
        return result

    def get_registration_trend(
        self, wave_id: str, days: int = 14
    ) -> list[dict[str, Any]]:
        start = datetime.combine(
            date.today() - timedelta(days=days - 1), datetime.min.time()
        )
        rows = (
            self.db.query(
                func.date(PPDBApplicant.created_at), func.count(PPDBApplicant.id)
            )
            .filter(
                PPDBApplicant.wave_id == wave_id,
                PPDBApplicant.created_at >= start,
            )
            .group_by(func.date(PPDBApplicant.created_at))
            .order_by(func.date(PPDBApplicant.created_at))
            .all()
        )
        counts = {str(d): c for d, c in rows}
        result: list[dict[str, Any]] = []
        for i in range(days):
            day = date.today() - timedelta(days=days - 1 - i)
            result.append(
                {"date": day.isoformat(), "count": counts.get(day.isoformat(), 0)}
            )
        return result

    def get_expired_pending_applicants(
        self, limit_time_str: str
    ) -> list[PPDBApplicant]:
        return cast(
            list[PPDBApplicant],
            self.db.query(PPDBApplicant)
            .filter(
                PPDBApplicant.payment_status == "pending",
                PPDBApplicant.payment_deadline <= limit_time_str,
                PPDBApplicant.deleted_at.is_(None),
            )
            .all(),
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
        return cast(
            list[PPDBApplicant],
            self.db.query(PPDBApplicant)
            .filter(
                PPDBApplicant.payment_status == "pending",
                PPDBApplicant.payment_deadline > now_str,
                PPDBApplicant.payment_deadline <= tomorrow_str,
                PPDBApplicant.deleted_at.is_(None),
            )
            .all(),
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

    # -------------------------------------------------------------------------
    # Documents & MOU
    # -------------------------------------------------------------------------
    def get_documents_by_applicant(self, applicant_id: str) -> list[FileUpload]:
        return cast(
            list[FileUpload],
            self.db.query(FileUpload)
            .filter(
                FileUpload.entity_type.like("ppdb_document:%"),
                FileUpload.entity_id == applicant_id,
            )
            .order_by(FileUpload.created_at.desc())
            .all(),
        )

    def get_mou_by_applicant(self, applicant_id: str) -> PPDBBMOU | None:
        return cast(
            PPDBBMOU | None,
            self.db.query(PPDBBMOU)
            .filter(PPDBBMOU.applicant_id == applicant_id)
            .first(),
        )
