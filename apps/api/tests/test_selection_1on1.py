import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from pydantic import AnyHttpUrl
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.ppdb import PPDBApplicant, PPDBPeriod, PPDBWave
from src.models.selection import (
    SelectionCategory,
    SelectionCriteria,
    SelectionResult,
    SelectionSession,
)
from src.modules.selection.schemas import (
    ApplicantScoreSave,
    ScoreInputItem,
    SessionCreate,
)
from src.repositories.selection_repository import SelectionRepository
from src.services.selection_service import SelectionService

WIB = ZoneInfo("Asia/Jakarta")


@pytest.fixture
def db():
    generator = get_db()
    session = next(generator)
    try:
        yield session
    finally:
        try:
            next(generator)
        except StopIteration:
            pass


@pytest.fixture
def active_wave(db: Session):
    db.query(PPDBWave).update({"status": "inactive"})
    db.query(PPDBPeriod).update({"status": "inactive"})
    db.commit()

    period_id = str(uuid.uuid4())
    period = PPDBPeriod(
        id=period_id,
        name="Periode 2026/2027",
        academic_year="2026/2027",
        status="active",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(period)

    wave_id = str(uuid.uuid4())
    wave = PPDBWave(
        id=wave_id,
        period_id=period_id,
        wave_number=1,
        name="Gelombang 1",
        status="active",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(wave)
    db.commit()
    return wave


def test_session_creation_quota_default_and_created_by(db: Session, active_wave):
    repo = SelectionRepository(db)
    svc = SelectionService(repo)

    tomorrow = (datetime.now(WIB).date() + timedelta(days=1)).isoformat()
    body = SessionCreate(
        name="Sesi Tahfidz Pagi 1",
        session_type="tahfidz",
        session_date=tomorrow,
        start_time="08:00",
        end_time="08:30",
        mode="online",
        officer_name="Ustaz Zaid",
        location=None,
        meeting_url=AnyHttpUrl("https://meet.google.com/xyz"),
        quota=0,  # Should default to 1 for 1:1 session
    )

    creator_id = str(uuid.uuid4())
    res = svc.create_session(body, creator_user_id=creator_id)
    session_id = res["id"]

    session_row = repo.get_session_by_id(session_id)
    assert session_row is not None
    assert session_row.quota == 1
    assert session_row.created_by == creator_id


def test_cleanup_expired_unbooked_sessions(db: Session, active_wave):
    repo = SelectionRepository(db)

    # 1. Past session without booking (should be deleted)
    past_date = (datetime.now(WIB).date() - timedelta(days=1)).isoformat()
    past_session = SelectionSession(
        id=str(uuid.uuid4()),
        wave_id=active_wave.id,
        name="Sesi Kemarin",
        session_type="tahfidz",
        session_date=date.fromisoformat(past_date),
        start_time="08:00",
        end_time="09:00",
        mode="offline",
        officer_name="Ustaz Fulan",
        location="Ruang A",
        quota=1,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(past_session)

    # 2. Future session without booking (should NOT be deleted)
    future_date = (datetime.now(WIB).date() + timedelta(days=2)).isoformat()
    future_session = SelectionSession(
        id=str(uuid.uuid4()),
        wave_id=active_wave.id,
        name="Sesi Masa Depan",
        session_type="tahfidz",
        session_date=date.fromisoformat(future_date),
        start_time="08:00",
        end_time="09:00",
        mode="offline",
        officer_name="Ustaz Fulan",
        location="Ruang B",
        quota=1,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(future_session)
    db.commit()

    deleted_count = repo.cleanup_expired_unbooked_sessions(active_wave.id)
    assert deleted_count >= 1

    assert repo.get_session_by_id(past_session.id) is None
    assert repo.get_session_by_id(future_session.id) is not None


def test_session_status_colors_red_yellow_green(db: Session, active_wave):
    repo = SelectionRepository(db)
    svc = SelectionService(repo)

    future_date = (datetime.now(WIB).date() + timedelta(days=2)).isoformat()

    # Session 1: unbooked -> RED
    s1 = SelectionSession(
        id=str(uuid.uuid4()),
        wave_id=active_wave.id,
        name="Sesi 1",
        session_type="tahfidz",
        session_date=date.fromisoformat(future_date),
        start_time="08:00",
        end_time="08:30",
        mode="offline",
        officer_name="Ustaz A",
        location="Ruang 1",
        quota=1,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(s1)

    # Session 2: booked but not evaluated -> YELLOW
    s2 = SelectionSession(
        id=str(uuid.uuid4()),
        wave_id=active_wave.id,
        name="Sesi 2",
        session_type="tahfidz",
        session_date=date.fromisoformat(future_date),
        start_time="09:00",
        end_time="09:30",
        mode="offline",
        officer_name="Ustaz A",
        location="Ruang 2",
        quota=1,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(s2)

    app_id = str(uuid.uuid4())
    applicant = PPDBApplicant(
        id=app_id,
        user_id=str(uuid.uuid4()),
        wave_id=active_wave.id,
        full_name="Calon Santri Budi",
        email="budi@example.com",
        registration_path="reguler",
        status="selection",
        phone="08123456789",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(applicant)

    sel_res = SelectionResult(
        id=str(uuid.uuid4()),
        applicant_id=app_id,
        session_id=s2.id,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(sel_res)
    db.commit()

    sessions_data = svc.get_sessions(session_type="tahfidz")
    s1_dict = next(s for s in sessions_data if s["id"] == s1.id)
    s2_dict = next(s for s in sessions_data if s["id"] == s2.id)

    assert s1_dict["status_color"] == "red"
    assert s1_dict["booked_count"] == 0

    assert s2_dict["status_color"] == "yellow"
    assert s2_dict["booked_count"] == 1
    assert s2_dict["booked_applicant"]["full_name"] == "Calon Santri Budi"

    # Now evaluate s2: add score in Tahfidz rubric -> GREEN
    cat = SelectionCategory(
        id=str(uuid.uuid4()),
        wave_id=active_wave.id,
        name="Rubrik Tahfidz",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(cat)
    crit = SelectionCriteria(
        id=str(uuid.uuid4()),
        category_id=cat.id,
        name="Kelancaran",
        weight=100.0,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(crit)
    db.commit()

    svc.save_result(
        ApplicantScoreSave(
            applicant_id=app_id,
            scores=[ScoreInputItem(criteria_id=crit.id, score=90.0)],
            notes="Sangat lancar",
        )
    )

    sessions_data_updated = svc.get_sessions(session_type="tahfidz")
    s2_updated = next(s for s in sessions_data_updated if s["id"] == s2.id)
    assert s2_updated["status_color"] == "green"
    assert s2_updated["is_evaluated"] is True
    assert s2_updated["evaluated_score"] == 90.0
