"""Guards for the applicant Health Identification Form (pengganti Medcheck).

Aturan mengikuti docs/REQUIREMENTS.md bagian "Formulir Identifikasi Kesehatan":
pertanyaan Ya/Tidak membuka keterangan secara kondisional, keterangan pada
jawaban "Tidak" dikosongkan, dan Pernyataan wajib disetujui. Validasi ini harus
dijalankan ulang di server, sehingga diuji pada level schema.
"""

import json

import pytest
from pydantic import ValidationError
from sqlalchemy import Text

from src.models.ppdb import PPDBApplicant
from src.modules.ppdb.schemas import (
    ApplicantAdminUpdate,
    ApplicantRegister,
    HealthIdentificationForm,
)


def _health(**overrides):
    base = {
        "chronic_disease": False,
        "diagnosed_conditions": [],
        "allergies": False,
        "regular_medication": False,
        "physical_limitation": False,
        "hospitalization_history": False,
        "special_needs": False,
        "emergency_contact_name": "Budi Santoso",
        "emergency_contact_relation": "Ayah",
        "emergency_contact_phone": "081234567890",
        "health_declaration_confirmed": True,
    }
    base.update(overrides)
    return base


def _register_payload(**overrides):
    return {
        "full_name": "Ahmad Fauzi",
        "email": "ahmad.fauzi@example.com",
        "phone": "081234567890",
        "registration_path": "reguler",
        "province": "Jawa Barat",
        "city": "Bogor",
        "district": "Bogor Selatan",
        "village": "Gg. Melati",
        "address": "Jl. Melati No. 12 RT 01/RW 03",
        **overrides,
    }


def test_model_column_is_unbounded_text():
    # Formulir terstruktur disimpan sebagai JSON; kolom tidak boleh dibatasi 255.
    assert isinstance(PPDBApplicant.disease_history.type, Text)


def test_valid_health_form_is_serialized_into_disease_history():
    body = ApplicantRegister(**_register_payload(health_form=_health()))
    assert body.health_form is not None
    stored = json.loads(body.disease_history)
    assert stored["emergency_contact_name"] == "Budi Santoso"
    assert stored["chronic_disease"] is False


def test_register_without_health_form_is_still_schema_valid_for_legacy_admin_flow():
    # Pendaftaran publik menolak payload tanpa health_form di service layer;
    # schema tetap mengizinkan None untuk jalur admin/legacy.
    assert ApplicantRegister(**_register_payload()).health_form is None


def test_yes_answer_requires_description():
    with pytest.raises(ValidationError, match="Keterangan riwayat penyakit kronis"):
        HealthIdentificationForm(**_health(chronic_disease=True))
    with pytest.raises(ValidationError, match="pengobatan rutin"):
        HealthIdentificationForm(**_health(regular_medication=True))
    with pytest.raises(ValidationError, match="keterbatasan fisik"):
        HealthIdentificationForm(**_health(physical_limitation=True))
    with pytest.raises(ValidationError, match="rawat inap"):
        HealthIdentificationForm(**_health(hospitalization_history=True))
    with pytest.raises(ValidationError, match="kebutuhan khusus"):
        HealthIdentificationForm(**_health(special_needs=True))


def test_no_answer_clears_description():
    form = HealthIdentificationForm(
        **_health(chronic_disease=False, chronic_disease_description="sisa lama")
    )
    assert form.chronic_disease_description is None

    form = HealthIdentificationForm(
        **_health(
            allergies=False,
            allergy_types=["Debu"],
            allergy_other="x",
            allergy_description="y",
        )
    )
    assert form.allergy_types == []
    assert form.allergy_other is None
    assert form.allergy_description is None


def test_other_checkbox_requires_free_text():
    with pytest.raises(ValidationError, match="kondisi lainnya"):
        HealthIdentificationForm(**_health(diagnosed_conditions=["Lainnya"]))
    with pytest.raises(ValidationError, match="alergi lainnya"):
        HealthIdentificationForm(**_health(allergies=True, allergy_types=["Lainnya"]))

    ok = HealthIdentificationForm(
        **_health(
            diagnosed_conditions=["Asma", "Lainnya"],
            diagnosed_conditions_other="Anemia",
        )
    )
    assert ok.diagnosed_conditions_other == "Anemia"


def test_checkbox_lists_do_not_force_minimum_one_and_reject_unknown_values():
    assert (
        HealthIdentificationForm(
            **_health(diagnosed_conditions=[])
        ).diagnosed_conditions
        == []
    )
    assert HealthIdentificationForm(**_health(allergies=True)).allergy_types == []
    with pytest.raises(ValidationError, match="tidak valid"):
        HealthIdentificationForm(**_health(diagnosed_conditions=["Flu"]))


def test_declaration_and_emergency_phone_are_mandatory():
    with pytest.raises(ValidationError, match="Pernyataan"):
        HealthIdentificationForm(**_health(health_declaration_confirmed=False))
    with pytest.raises(ValidationError):
        HealthIdentificationForm(**_health(emergency_contact_phone="08abc"))
    with pytest.raises(ValidationError):
        HealthIdentificationForm(**_health(emergency_contact_phone="0812"))


def test_admin_update_accepts_structured_form_and_long_legacy_text():
    update = ApplicantAdminUpdate(health_form=_health())
    assert update.health_form is not None
    assert ApplicantAdminUpdate(disease_history="x" * 5000).disease_history
