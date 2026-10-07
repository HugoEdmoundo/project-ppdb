"""Tests for parent/guardian fields on applicant models and schemas."""

from src.models.ppdb import PPDBApplicant
from src.modules.ppdb.schemas import ApplicantRegister


def _valid_register_payload(**overrides):
    base = {
        "full_name": "Ahmad Fauzi",
        "email": "fauzi@example.com",
        "phone": "081234567890",
        "registration_path": "reguler",
        "province": "Jawa Barat",
        "city": "Kota Bogor",
        "district": "Bogor Barat",
        "village": "Margajaya",
        "address": "Jl. Raya Dramaga No. 12",
        "father_name": "Fauzi Anwar",
        "father_job": "Karyawan Swasta",
        "father_phone": "081298765432",
        "mother_name": "Siti Aminah",
        "mother_job": "Ibu Rumah Tangga",
        "parent_phone": "081298765432",
        "parent_income": "Rp 5.000.000 - Rp 10.000.000",
        "parent_email": "ortu@example.com",
        "health_form": {
            "chronic_disease": False,
            "diagnosed_conditions": [],
            "allergies": False,
            "regular_medication": False,
            "physical_limitation": False,
            "hospitalization_history": False,
            "special_needs": False,
            "emergency_contact_name": "Fauzi Anwar",
            "emergency_contact_relation": "Ayah",
            "emergency_contact_phone": "081298765432",
            "health_declaration_confirmed": True,
        },
    }
    base.update(overrides)
    return base


def test_applicant_register_accepts_parent_fields():
    data = _valid_register_payload()
    reg = ApplicantRegister(**data)
    assert reg.father_name == "Fauzi Anwar"
    assert reg.mother_name == "Siti Aminah"
    assert reg.parent_phone == "081298765432"
    assert reg.parent_income == "Rp 5.000.000 - Rp 10.000.000"


def test_applicant_model_has_parent_columns():
    table = PPDBApplicant.__table__
    cols = {c.name for c in table.columns}
    assert "father_name" in cols
    assert "father_job" in cols
    assert "mother_name" in cols
    assert "mother_job" in cols
    assert "guardian_name" in cols
    assert "guardian_job" in cols
    assert "parent_phone" in cols
    assert "parent_income" in cols
    assert "parent_email" in cols
