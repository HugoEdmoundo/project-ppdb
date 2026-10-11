"""Create (or reset) a single test PPDB applicant account.

Run from the `apps/api` directory:
    python -m scripts.create_test_applicant

Idempotent. It ensures a `Pendaftar` user named `testpendaftar` exists with a
known password and an attached PPDB applicant row, then marks the applicant's
*form payment* as already settled (``payment_status="paid"``,
``status="document_uploaded_pending"``) so the account can reach the applicant
dashboard WITHOUT going through form payment.

TEST FIXTURE — penting:
  Script ini SENGAJA tidak membuat transaksi pembayaran berstatus ``success``.
  Karena itu akun ini TIDAK ikut dihitung ke kuota gelombang maupun peringkat
  diskon "X pendaftar pertama" (lihat
  ``count_paid_form_payments_in_wave`` / ``get_paid_form_payment_rank``).
  Halaman "Pembayaran Formulir" juga tidak menampilkan tagihan untuk akun ini.

Akun ditautkan ke gelombang aktif bila ada, atau gelombang terbaru. Bila belum
ada gelombang sama sekali, dibuat periode + gelombang test minimal agar
dashboard tetap bisa dipakai.
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from src.core.database import get_sessionmaker  # noqa: E402
from src.core.security import hash_password  # noqa: E402
from src.models.auth import Role, User  # noqa: E402
from src.models.ppdb import PPDBApplicant, PPDBPeriod, PPDBWave  # noqa: E402

WIB = ZoneInfo("Asia/Jakarta")

TEST_USERNAME = "testpendaftar"
TEST_PASSWORD = "TestPPDB123!."
TEST_EMAIL = "testpendaftar@ppdb.local"
TEST_FULL_NAME = "Pendaftar Test"
TEST_PHONE = "081200000000"
TEST_PATH = "reguler"
TEST_STATUS = "document_uploaded_pending"


def _resolve_wave(db) -> tuple[PPDBWave, bool]:
    """Return (wave, created). Prefer active wave, else latest, else create one."""
    wave = db.scalars(
        select(PPDBWave)
        .where(PPDBWave.status == "active")
        .order_by(PPDBWave.created_at.desc())
    ).first()
    if wave:
        return wave, False

    wave = db.scalars(select(PPDBWave).order_by(PPDBWave.created_at.desc())).first()
    if wave:
        return wave, False

    now = datetime.now(WIB)
    period = PPDBPeriod(
        id=f"period-test-{uuid4().hex[:8]}",
        name="Periode Test",
        academic_year="TEST",
        status="active",
        created_at=now,
        updated_at=now,
    )
    db.add(period)
    db.flush()

    wave = PPDBWave(
        id=f"wave-test-{uuid4().hex[:8]}",
        period_id=period.id,
        wave_number=1,
        name="Gelombang Test",
        status="active",
        quota=0,
        early_discount_quota=0,
        registration_fee=0,
        second_stage_fee=0,
        minimum_dp=0,
        created_at=now,
        updated_at=now,
    )
    db.add(wave)
    db.flush()
    return wave, True


def main() -> None:
    print("Menyiapkan akun test pendaftar...")
    session_factory = get_sessionmaker()

    with session_factory() as db:
        role = db.scalars(select(Role).where(Role.name == "Pendaftar")).first()
        if not role:
            print("Role 'Pendaftar' belum ada. Jalankan dulu: python -m scripts.seed")
            raise SystemExit(1)

        wave, wave_created = _resolve_wave(db)
        if wave_created:
            print(f"  gelombang test dibuat: {wave.name} ({wave.id})")
        else:
            print(f"  memakai gelombang: {wave.name} ({wave.id}) [{wave.status}]")

        now = datetime.now(WIB)
        user = db.scalars(select(User).where(User.username == TEST_USERNAME)).first()

        if user:
            user.password_hash = hash_password(TEST_PASSWORD)
            user.is_active = True
            user.user_type = "applicant"
            user.role_id = role.id
            user.full_name = user.full_name or TEST_FULL_NAME
            user.updated_at = now
            print(f"  user ditemukan, password direset: {TEST_USERNAME}")
        else:
            email = TEST_EMAIL
            if db.scalars(select(User).where(User.email == email)).first():
                email = f"{TEST_USERNAME}.{uuid4().hex[:6]}@ppdb.local"
            user = User(
                id=str(uuid4()),
                username=TEST_USERNAME,
                password_hash=hash_password(TEST_PASSWORD),
                email=email,
                phone=TEST_PHONE,
                user_type="applicant",
                role_id=role.id,
                full_name=TEST_FULL_NAME,
                is_active=True,
                failed_login_attempts=0,
                created_at=now,
                updated_at=now,
            )
            db.add(user)
            print(f"  user dibuat: {TEST_USERNAME}")

        db.flush()

        deadline = now + timedelta(days=7)
        applicant = db.scalars(
            select(PPDBApplicant).where(PPDBApplicant.user_id == user.id)
        ).first()

        if applicant:
            applicant.wave_id = wave.id
            applicant.payment_status = "paid"
            applicant.status = TEST_STATUS
            applicant.deleted_at = None
            applicant.rejection_reason = None
            if not applicant.payment_deadline:
                applicant.payment_deadline = deadline
            applicant.updated_at = now
            print(f"  applicant diperbarui: {applicant.id}")
        else:
            applicant = PPDBApplicant(
                id=f"applicant-{uuid4()}",
                wave_id=wave.id,
                user_id=user.id,
                full_name=TEST_FULL_NAME,
                email=user.email,
                phone=TEST_PHONE,
                registration_path=TEST_PATH,
                status=TEST_STATUS,
                payment_status="paid",
                payment_deadline=deadline,
                created_at=now,
                updated_at=now,
            )
            db.add(applicant)
            print(f"  applicant dibuat: {applicant.id}")

        db.commit()

    print("\nSelesai. Akun test pendaftar siap dipakai:")
    print(f"  Username : {TEST_USERNAME}")
    print(f"  Password : {TEST_PASSWORD}")
    print("  Login    : /auth/login")
    print(f"  Status   : payment_status=paid, status={TEST_STATUS}")
    print("  Catatan  : tanpa transaksi 'success' -> tidak dihitung ke kuota/diskon.")


if __name__ == "__main__":
    main()
