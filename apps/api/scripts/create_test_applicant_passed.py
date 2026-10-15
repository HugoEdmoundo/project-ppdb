"""Create (or reset) a fully-progressed test PPDB applicant account.

Fokus: akun pendaftar yang SUDAH melewati seluruh tahapan dan dinyatakan
LULUS seleksi, sehingga LoA (Letter of Acceptance) sudah bisa dilihat di
dashboard -- TETAPI belum dikonfirmasi/ditandatangani (``is_loa_signed=False``).

Run from the ``apps/api`` directory:
    python -m scripts.create_test_applicant_passed

Idempotent. Membuat/memperbarui:
  * user ``Pendaftar`` bernama ``testpendaftar2`` dengan password tetap;
  * applicant dengan ``payment_status="paid"`` dan ``status="passed"``;
  * nilai TIU tersimpan (seolah sudah ujian);
  * rubrik global "Tahfidz" & "Wawancara" (kategori + kriteria) bila belum ada,
    beserta nilai Session 1:1 Tahfidz & Wawancara milik pendaftar ini;
  * hasil seleksi ``graduation_status="passed"`` dengan sesi Tahfidz/Wawancara
    yang sudah di-booking (jadwal sesi dibuat khusus untuk akun test ini).

TEST FIXTURE — penting:
  Script ini SENGAJA tidak membuat transaksi pembayaran berstatus ``success``.
  Karena itu akun ini TIDAK ikut dihitung ke kuota gelombang maupun peringkat
  diskon "X pendaftar pertama" (lihat ``count_paid_form_payments_in_wave`` /
  ``get_paid_form_payment_rank``). Halaman "Pembayaran Formulir" juga tidak
  menampilkan tagihan untuk akun ini.

  DP / Tahap 2 sengaja dibiarkan ``dp_status="pending"`` (belum bayar) supaya
  alur daftar ulang setelah LoA tetap bisa diuji.

Nomor registrasi + LoA dibuat otomatis oleh endpoint ``/ppdb/applicants/me/loa``
saat dashboard dibuka. Akun ditautkan ke gelombang aktif bila ada, atau
gelombang terbaru. Bila belum ada gelombang sama sekali, dibuat periode +
gelombang test minimal agar dashboard tetap bisa dipakai.
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, text  # noqa: E402

from src.core.database import get_sessionmaker  # noqa: E402
from src.core.security import hash_password  # noqa: E402
from src.models.auth import Role, User  # noqa: E402
from src.models.ppdb import (  # noqa: E402
    PPDBApplicant,
    PPDBPeriod,
    PPDBWave,
    TIUResult,
)
from src.models.selection import (  # noqa: E402
    SelectionCategory,
    SelectionResult,
    SelectionScore,
    SelectionSession,
)

WIB = ZoneInfo("Asia/Jakarta")

TEST_USERNAME = "testpendaftar2"
TEST_PASSWORD = "TestPPDB123!."
TEST_EMAIL = "testpendaftar2@ppdb.local"
TEST_FULL_NAME = "Pendaftar Test Lulus"
TEST_PHONE = "081200000001"
TEST_PATH = "reguler"
TEST_STATUS = "passed"

# Kategori rubrik bersifat global (wave_id="global") mengikuti SelectionService.
RUBRIC_CATEGORY_NAMES = ("Tahfidz", "Wawancara")
# (nama kriteria, bobot) — dipakai hanya bila kategori belum punya kriteria.
DEFAULT_CRITERIA: dict[str, list[tuple[str, float]]] = {
    "Tahfidz": [("Kelancaran Hafalan", 40.0), ("Tajwid & Tartil", 60.0)],
    "Wawancara": [("Motivasi & Adab", 50.0), ("Komunikasi", 50.0)],
}
# Nilai dasar per kategori (diturunkan sedikit per kriteria agar bervariasi).
BASE_SCORE: dict[str, float] = {"Tahfidz": 92.0, "Wawancara": 88.0}

TAHFIDZ_SESSION_NAME = "Sesi Tahfidz (Test Akun)"
INTERVIEW_SESSION_NAME = "Sesi Wawancara (Test Akun)"


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


def _ensure_category(db, name: str, now: datetime) -> tuple[SelectionCategory, bool]:
    category = db.scalars(
        select(SelectionCategory).where(
            SelectionCategory.wave_id == "global",
            SelectionCategory.name == name,
        )
    ).first()
    if category:
        return category, False
    category = SelectionCategory(
        id=str(uuid4()),
        wave_id="global",
        name=name,
        created_at=now,
        updated_at=now,
    )
    db.add(category)
    db.flush()
    return category, True


def _ensure_criteria(
    db, category: SelectionCategory, now: datetime
) -> tuple[list[tuple[str, str]], bool]:
    """Return [(criteria_id, name)], creating default criteria if needed.

    Catatan: kolom ``description`` pada ORM ``SelectionCriteria`` tidak ada di
    skema DB produksi (drift), sehingga helper ini sengaja memakai SQL mentah
    dan hanya menyentuh kolom yang benar-benar ada. Ini menjaga akun test tetap
    bisa dibuat tanpa mengubah skema remote.
    """
    existing = [
        (row[0], row[1])
        for row in db.execute(
            text(
                "SELECT id, name FROM selection_criteria "
                "WHERE category_id = :cid ORDER BY created_at ASC"
            ),
            {"cid": category.id},
        ).all()
    ]
    if existing:
        return existing, False

    created: list[tuple[str, str]] = []
    for crit_name, weight in DEFAULT_CRITERIA.get(category.name, []):
        criteria_id = str(uuid4())
        db.execute(
            text(
                "INSERT INTO selection_criteria "
                "(id, category_id, name, weight, created_at, updated_at) "
                "VALUES (:id, :cid, :name, :weight, :created_at, :updated_at)"
            ),
            {
                "id": criteria_id,
                "cid": category.id,
                "name": crit_name,
                "weight": weight,
                "created_at": now,
                "updated_at": now,
            },
        )
        created.append((criteria_id, crit_name))
    db.flush()
    return created, True


def _ensure_score(
    db, applicant_id: str, criteria_id: str, value: float, now: datetime
) -> None:
    score = db.scalars(
        select(SelectionScore).where(
            SelectionScore.applicant_id == applicant_id,
            SelectionScore.criteria_id == criteria_id,
        )
    ).first()
    if score:
        score.score = value
        score.updated_at = now
    else:
        db.add(
            SelectionScore(
                id=str(uuid4()),
                applicant_id=applicant_id,
                criteria_id=criteria_id,
                score=value,
                created_at=now,
                updated_at=now,
            )
        )
    db.flush()


def _ensure_session(
    db,
    wave_id: str,
    name: str,
    session_type: str,
    officer_name: str,
    mode: str,
    now: datetime,
) -> tuple[SelectionSession, bool]:
    session = db.scalars(
        select(SelectionSession).where(
            SelectionSession.wave_id == wave_id,
            SelectionSession.name == name,
        )
    ).first()
    if session:
        return session, False
    session = SelectionSession(
        id=str(uuid4()),
        wave_id=wave_id,
        name=name,
        session_type=session_type,
        session_date=now.date(),
        start_time="09:00",
        end_time="09:45",
        mode=mode,
        officer_name=officer_name,
        location="Ruang Seleksi Pesantren Ar-Rahman" if mode == "offline" else None,
        meeting_url=(
            f"https://zoom.us/j/test-{session_type}" if mode == "online" else None
        ),
        description="Sesi uji untuk akun test (sudah terlaksana).",
        quota=1,
        created_by=None,
        created_at=now,
        updated_at=now,
    )
    db.add(session)
    db.flush()
    return session, True


def main() -> None:
    print("Menyiapkan akun test pendaftar (LULUS, LoA belum ditandatangani)...")
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
            applicant.dp_status = "pending"
            applicant.is_loa_signed = False
            applicant.loa_signed_at = None
            applicant.loa_signer_name = None
            applicant.loa_signer_relation = None
            applicant.loa_signature_data = None
            applicant.loa_signature_token = None
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
                dp_status="pending",
                is_loa_signed=False,
                payment_deadline=deadline,
                created_at=now,
                updated_at=now,
            )
            db.add(applicant)
            print(f"  applicant dibuat: {applicant.id}")

        db.flush()

        # Nomor registrasi dibuat sekali (dipakai LoA). Tidak diubah saat re-run.
        if not applicant.registration_number:
            clean_id = "".join(c for c in applicant.id if c.isalnum())[-5:].upper()
            applicant.registration_number = (
                f"REG-{now.strftime('%d%m%y')}{clean_id.zfill(5)}"
            )

        # ── Rubrik + nilai Session 1:1 (Tahfidz & Wawancara) ──────────────────
        score_count = 0
        for cat_name in RUBRIC_CATEGORY_NAMES:
            category, _ = _ensure_category(db, cat_name, now)
            criteria_list, _ = _ensure_criteria(db, category, now)
            base = BASE_SCORE.get(cat_name, 85.0)
            for idx, (criteria_id, _crit_name) in enumerate(criteria_list):
                value = max(60.0, base - idx)
                _ensure_score(db, applicant.id, criteria_id, value, now)
                score_count += 1
        print(f"  nilai rubrik dipastikan: {score_count} kriteria")

        # ── Sesi Tahfidz & Wawancara (sudah ter-booking oleh akun ini) ────────
        tahfidz_session, _ = _ensure_session(
            db,
            wave.id,
            TAHFIDZ_SESSION_NAME,
            "tahfidz",
            "Ust. Penguji Test",
            "offline",
            now,
        )
        interview_session, _ = _ensure_session(
            db,
            wave.id,
            INTERVIEW_SESSION_NAME,
            "interview",
            "Ust. Pewawancara Test",
            "online",
            now,
        )
        print(f"  sesi tahfidz: {tahfidz_session.id}")
        print(f"  sesi wawancara: {interview_session.id}")

        # ── Hasil seleksi: LULUS ──────────────────────────────────────────────
        result = db.scalars(
            select(SelectionResult).where(SelectionResult.applicant_id == applicant.id)
        ).first()
        if not result:
            result = SelectionResult(
                id=str(uuid4()),
                applicant_id=applicant.id,
                created_at=now,
                updated_at=now,
            )
            db.add(result)
        result.session_id = tahfidz_session.id
        result.interview_session_id = interview_session.id
        result.graduation_status = "passed"
        result.score = 88.5
        result.notes = (
            "Pendaftar dinyatakan LULUS seleksi (akun test; LoA belum "
            "ditandatangani)."
        )
        result.updated_at = now
        db.flush()

        # ── Nilai TIU (seolah sudah ujian & terkirim lewat webhook) ───────────
        tiu = db.scalars(
            select(TIUResult).where(TIUResult.applicant_id == applicant.id)
        ).first()
        if tiu:
            tiu.score = 85.0
        else:
            db.add(
                TIUResult(
                    id=str(uuid4()),
                    applicant_id=applicant.id,
                    attempt_id=None,
                    idempotency_key=f"fixture-tiu-{applicant.id}",
                    score=85.0,
                    completed_at=now,
                    created_at=now,
                )
            )

        db.commit()

    print("\nSelesai. Akun test pendaftar LULUS siap dipakai:")
    print(f"  Username : {TEST_USERNAME}")
    print(f"  Password : {TEST_PASSWORD}")
    print("  Login    : /auth/login")
    print(f"  Status   : payment_status=paid, status={TEST_STATUS}")
    print("  LoA      : tersedia, BELUM ditandatangani (is_loa_signed=False)")
    print("  DP       : belum dibayar (dp_status=pending)")
    print("  Catatan  : tanpa transaksi 'success' -> tidak dihitung ke kuota/diskon.")


if __name__ == "__main__":
    main()
