from datetime import date

import pytest
from pydantic import ValidationError

from src.modules.ppdb.schemas import (
    TIUQuestionInput,
    WaveBase,
    WaveFeeItemCreate,
)
from src.modules.selection.schemas import SessionCreate


def _wave_payload(**overrides):
    return {
        "name": "Gelombang 1",
        "allowed_paths": "reguler,rapot",
        "registration_start_date": date(2026, 1, 1),
        "registration_end_date": date(2026, 1, 31),
        "document_upload_end_date": date(2026, 2, 5),
        "selection_date": date(2026, 2, 10),
        "quota": 100,
        "early_discount_quota": 10,
        **overrides,
    }


def test_wave_early_discount_quota_must_fit_wave_quota():
    assert WaveBase(**_wave_payload()).early_discount_quota == 10
    with pytest.raises(ValidationError, match="tidak boleh melebihi kuota"):
        WaveBase(**_wave_payload(early_discount_quota=101))


def test_component_discount_requires_matching_type_and_value():
    item = WaveFeeItemCreate(
        name="SPP",
        nominal=500_000,
        discount_type="percent",
        discount_value=10,
        discount_scope="first_x",
    )
    assert item.discount_scope == "first_x"

    with pytest.raises(ValidationError):
        WaveFeeItemCreate(name="SPP", nominal=500_000, discount_type="percent")

    with pytest.raises(ValidationError, match="maksimal 100%"):
        WaveFeeItemCreate(
            name="SPP", nominal=500_000, discount_type="percent", discount_value=101
        )


def test_selection_session_requires_schedule_and_mode_details():
    session = SessionCreate(
        name="Tahfidz Pagi",
        session_type="tahfidz",
        session_date="2026-10-10",
        start_time="08:00",
        end_time="09:00",
        mode="offline",
        officer_name="Ustaz Ahmad",
        location="Ruang 1",
    )
    assert session.mode == "offline"

    with pytest.raises(ValidationError, match="Lokasi wajib diisi"):
        SessionCreate(
            name="Wawancara Online",
            session_type="interview",
            session_date="2026-10-10",
            start_time="08:00",
            end_time="09:00",
            mode="offline",
            officer_name="Ibu Siti",
        )

    with pytest.raises(ValidationError, match="Jam selesai harus setelah jam mulai"):
        SessionCreate(
            name="Wawancara",
            session_type="interview",
            session_date="2026-10-10",
            start_time="09:00",
            end_time="08:00",
            mode="online",
            officer_name="Ibu Siti",
            meeting_url="https://zoom.us/j/123",
        )


def test_tiu_sync_question_requires_unique_options_and_valid_answer():
    with pytest.raises(ValidationError, match="tidak boleh duplikat"):
        TIUQuestionInput(
            id="q1",
            title="Hitung 1 + 1",
            options=["2", "2"],
            correct_option_index=0,
        )

    with pytest.raises(ValidationError, match="menunjuk salah satu opsi"):
        TIUQuestionInput(
            id="q1",
            title="Hitung 1 + 1",
            options=["2", "3"],
            correct_option_index=2,
        )


def test_period_create_supports_head_of_committee():
    from src.modules.ppdb.schemas import PeriodCreate

    p = PeriodCreate(
        name="Periode 2026/2027",
        academic_year="2026/2027",
        head_of_committee="Dr. H. Ahmad Dahlan, M.Pd.",
    )
    assert p.head_of_committee == "Dr. H. Ahmad Dahlan, M.Pd."
    assert p.name == "Periode 2026/2027"
    assert p.academic_year == "2026/2027"


def test_loa_signature_request_validation():
    from src.modules.ppdb.schemas import LoASignatureRequest

    req = LoASignatureRequest(
        signer_name="Budi Santoso",
        signer_relation="Ayah",
        signature_data="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    )
    assert req.signer_name == "Budi Santoso"
    assert req.signer_relation == "Ayah"
    assert req.signature_data.startswith("data:image/png")
