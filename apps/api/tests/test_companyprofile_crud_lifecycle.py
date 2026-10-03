"""End-to-end CRUD lifecycle tests for every companyprofile entity.

`test_companyprofile_crud.py` pins the validation contract. This file answers
the other question: for each entity the CMS dashboard exposes, does a row
actually survive the full round trip -- create, list, detail, update, delete --
and is it really gone afterwards?

Each entity is exercised through the same five steps, so a tab that is
half-wired (e.g. the row is created but the list omits it) fails here instead
of in the browser.

Contact-info and the settings key/value pair are covered too: they are separate
routes, not the generic `/{entity}` handler, but they are CMS writes all the same.
"""

from collections.abc import Generator
from typing import Any, cast

import pytest
from fastapi.testclient import TestClient

from src.core.database import create_record, execute_raw
from src.core.security import hash_password
from src.main import app

UID = "cp-lifecycle-user"


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        create_record(
            "users",
            {
                "id": UID,
                "username": "cp_lifecycle_tester",
                "password_hash": hash_password("TesPass123"),
                "email": "cp_lifecycle@example.com",
                "phone": "",
                "full_name": "Lifecycle Tester",
                "user_type": "superadmin",
                "is_active": 1,
                "avatar_url": "",
                "failed_login_attempts": 0,
            },
        )
        yield c
        execute_raw("DELETE FROM audit_log WHERE user_id = :u", {"u": UID})
        execute_raw("DELETE FROM users WHERE id = :i", {"i": UID})


@pytest.fixture(scope="module")
def cp(client: TestClient) -> Generator[TestClient, None, None]:
    resp = client.post(
        "/companyprofile/auth/login",
        json={"username": "cp_lifecycle_tester", "password": "TesPass123"},
    )
    assert resp.status_code == 200, resp.text
    yield client


# Each case: the entity segment, a create payload carrying every writable
# column, and the change an update makes. `slug` is unique per entity via the
# test id below, so the cases stay independent of each other and of run order.
ENTITY_CASES: list[dict[str, Any]] = [
    {
        "entity": "news",
        "create": {
            "slug": " lifecycle-news ",
            "category": "Pengumuman",
            "date": "2026-03-05",
            "image": "news.png",
            "content": '{"title": "Judul", "content": "isi", "excerpt": "ringkas"}',
        },
        "update": {"category": "Prestasi", "date": "2026-04-01"},
        "check": {"slug": "lifecycle-news", "category": "Prestasi", "date": "2026-04-01"},
    },
    {
        "entity": "programs",
        "create": {
            "slug": "Lifecycle Program",
            "icon": "book",
            "image": "prog.png",
            "content": '{"title": "Program", "content": "isi"}',
        },
        "update": {"icon": "graduation"},
        "check": {"slug": "lifecycle-program", "icon": "graduation"},
    },
    {
        "entity": "facilities",
        "create": {
            "category": "Asrama",
            "image": "asrama.png",
            "content": '{"name": "Asrama Putri", "content": "isi"}',
        },
        "update": {"category": "Masjid"},
        "check": {"category": "Masjid"},
    },
    {
        "entity": "staff",
        "create": {
            "role": "teacher",
            "image": "ustadz.png",
            "content": '{"name": "Ustadz Test", "content": "isi"}',
        },
        "update": {"role": "leader"},
        "check": {"role": "leader"},
    },
    {
        "entity": "achievements",
        "create": {
            "year": "2026",
            "image": "piala.png",
            "content": '{"title": "Juara", "content": "isi"}',
        },
        "update": {"year": "2025"},
        "check": {"year": 2025},
    },
    {
        "entity": "gallery",
        "create": {
            "category": "Kegiatan",
            "image": "kegiatan.png",
            "content": '{"title": "Foto Kegiatan", "content": "isi"}',
        },
        "update": {"category": "Ekstrakurikuler"},
        "check": {"category": "Ekstrakurikuler"},
    },
    {
        "entity": "social-links",
        "create": {
            "label": "Instagram",
            "href": "https://instagram.com/ptdarrahman",
            "path": "M12 2c2.7 0 3 0 4.1.1",
        },
        "update": {"label": "Instagram Baru", "href": "https://instagram.com/ar"},
        "check": {"label": "Instagram Baru", "href": "https://instagram.com/ar"},
    },
    {
        "entity": "testimonials",
        "create": {
            "name": "Bapak Lifecycle",
            "child": "Anak Lifecycle",
            "order": "3",
            "image": "ortu.png",
            "content": '{"quote": "Alhamdulillah", "content": "isi"}',
        },
        "update": {"order": "7", "child": "Anak Baru"},
        "check": {"order": 7, "child": "Anak Baru"},
    },
]

CASE_IDS = [str(case["entity"]) for case in ENTITY_CASES]


@pytest.mark.parametrize("case", ENTITY_CASES, ids=CASE_IDS)
def test_entity_full_crud_lifecycle(
    cp: TestClient, case: dict[str, Any]
) -> None:
    """Create -> list -> detail -> update -> delete, verified at each step."""
    entity = str(case["entity"])
    base = f"/companyprofile/{entity}"

    created = cp.post(base, json=case["create"])
    assert created.status_code == 200, f"{entity} create: {created.text}"
    record = cast(dict[str, Any], created.json())
    record_id = record["id"]

    try:
        # 1. List must include the new row.
        listed = cp.get(base)
        assert listed.status_code == 200, f"{entity} list: {listed.text}"
        ids = [i["id"] for i in cast(list[dict[str, Any]], listed.json())]
        assert record_id in ids, f"{entity} created but missing from list"

        # 2. Detail must return the row, and carry the create payload.
        detail = cp.get(f"{base}/{record_id}")
        assert detail.status_code == 200, f"{entity} detail: {detail.text}"
        for key, value in case["check"].items():
            if key in case["update"]:
                continue
            assert cast(dict[str, Any], detail.json()).get(key) == value, (
                f"{entity} detail.{key}"
            )

        # 3. Update must persist and be reflected in the detail response.
        updated = cp.put(f"{base}/{record_id}", json=case["update"])
        assert updated.status_code == 200, f"{entity} update: {updated.text}"
        for key, value in case["check"].items():
            assert cast(dict[str, Any], updated.json()).get(key) == value, (
                f"{entity} update response {key}"
            )

        # 4. Re-read: the change must be in the database, not just the response.
        reread = cp.get(f"{base}/{record_id}")
        assert reread.status_code == 200, f"{entity} re-read: {reread.text}"
        for key, value in case["check"].items():
            assert cast(dict[str, Any], reread.json()).get(key) == value, (
                f"{entity} persisted {key}"
            )

        # 5. Delete.
        deleted = cp.delete(f"{base}/{record_id}")
        assert deleted.status_code == 200, f"{entity} delete: {deleted.text}"
    finally:
        cp.delete(f"{base}/{record_id}")

    # 6. Gone from detail and from the list.
    assert cp.get(f"{base}/{record_id}").status_code == 404, (
        f"{entity} still readable after delete"
    )
    ids = [i["id"] for i in cast(list[dict[str, Any]], cp.get(base).json())]
    assert record_id not in ids, f"{entity} still listed after delete"


@pytest.mark.parametrize("case", ENTITY_CASES, ids=CASE_IDS)
def test_entity_update_of_deleted_row_is_404(
    cp: TestClient, case: dict[str, Any]
) -> None:
    """A deleted id must not be silently re-created by a later PUT."""
    entity = str(case["entity"])
    base = f"/companyprofile/{entity}"
    created = cp.post(base, json=case["create"])
    assert created.status_code == 200, created.text
    record_id = cast(dict[str, Any], created.json())["id"]
    assert cp.delete(f"{base}/{record_id}").status_code == 200
    assert cp.put(f"{base}/{record_id}", json=case["update"]).status_code == 404
    assert cp.delete(f"{base}/{record_id}").status_code == 404


@pytest.mark.parametrize("case", ENTITY_CASES, ids=CASE_IDS)
def test_entity_rejects_unauthenticated_writes(case: dict[str, Any]) -> None:
    """Public GET, private writes -- the CMS must not accept anon edits.

    Uses its own TestClient: the session cookie lives on the client, so the
    module-scoped `cp` one is already logged in by the time this runs.
    """
    entity = str(case["entity"])
    base = f"/companyprofile/{entity}"
    with TestClient(app) as anon:
        assert anon.get(base).status_code == 200, f"{entity} public list"
        assert anon.post(base, json=case["create"]).status_code == 401, entity
        assert anon.put(f"{base}/apa-saja", json=case["update"]).status_code == 401, entity
        assert anon.delete(f"{base}/apa-saja").status_code == 401, entity


# --------------------------------------------------------------------------
# contact-info: single row, PUT-only
# --------------------------------------------------------------------------


def test_contact_info_round_trip(cp: TestClient) -> None:
    # The seed script creates no contact_info row, so GET is 404 until the
    # first PUT. Do not assume the row already exists.
    seeded = cp.get("/companyprofile/contact-info")
    original: dict[str, Any] = (
        cast(dict[str, Any], seeded.json()) if seeded.status_code == 200 else {}
    )

    updated = cp.put(
        "/companyprofile/contact-info",
        json={"phone_primary": "08123456789", "email_admission": "ppdb@ar-rahman.test"},
    )
    assert updated.status_code == 200, updated.text
    body = cast(dict[str, Any], updated.json())
    assert body["phone_primary"] == "08123456789"
    assert body["email_admission"] == "ppdb@ar-rahman.test"
    # An omitted field must survive, not be nulled out.
    # Exclude auto-updated timestamp fields and the fields we intentionally changed.
    AUTO_FIELDS = {"updated_at", "created_at", "id", "phone_primary", "email_admission"}
    for key, value in original.items():
        if key in AUTO_FIELDS:
            continue
        assert body.get(key) == value, f"contact-info lost {key}"

    # Persisted, not just echoed back.
    reread = cp.get("/companyprofile/contact-info")
    assert cast(dict[str, Any], reread.json())["phone_primary"] == "08123456789"

    # Restore so the seeded fixture stays usable for other tests.
    restore = {k: v for k, v in original.items() if k != "id"}
    assert cp.put("/companyprofile/contact-info", json=restore).status_code == 200


@pytest.mark.xfail(
    strict=True,
    reason=(
        "BUG: ContactInfoUpdateReq is a plain BaseModel, so Pydantic silently "
        "drops unknown keys instead of rejecting them. A mistyped field name in "
        "the CMS form returns 200 and saves nothing. The generic /{entity} route "
        "rejects unknown fields with 422, so the two disagree. Fix by setting "
        "model_config = ConfigDict(extra='forbid') on ContactInfoUpdateReq."
    ),
)
def test_contact_info_rejects_unknown_field(cp: TestClient) -> None:
    assert (
        cp.put(
            "/companyprofile/contact-info", json={"not_a_column": "x"}
        ).status_code
        == 422
    )


# --------------------------------------------------------------------------
# settings: key/value, PUT-only
# --------------------------------------------------------------------------

WRITABLE_KEY = "site_description"


def test_setting_round_trip(cp: TestClient) -> None:
    public_before = cp.get(f"/companyprofile/settings/{WRITABLE_KEY}")
    assert public_before.status_code == 200, public_before.text
    original = cast(dict[str, Any], public_before.json())["value"]

    updated = cp.put(
        f"/companyprofile/settings/{WRITABLE_KEY}", json={"value": "Deskripsi baru."}
    )
    assert updated.status_code == 200, updated.text
    assert cast(dict[str, Any], updated.json())["value"] == "Deskripsi baru."
    assert (
        cast(dict[str, Any], cp.get(f"/companyprofile/settings/{WRITABLE_KEY}").json())[
            "value"
        ]
        == "Deskripsi baru."
    )

    restored = cp.put(
        f"/companyprofile/settings/{WRITABLE_KEY}", json={"value": original}
    )
    assert restored.status_code == 200, restored.text


def test_setting_write_is_rejected_for_unknown_key(cp: TestClient) -> None:
    resp = cp.put("/companyprofile/settings/key-ngada", json={"value": "x"})
    assert resp.status_code == 400, resp.text


def test_setting_write_is_rejected_for_admin_only_key_via_public_read(
    cp: TestClient,
) -> None:
    """An admin-only key is writable but must not leak through public GET."""
    admin_only = "whatsapp_number"
    assert cp.put(f"/companyprofile/settings/{admin_only}", json={"value": "62811"}).status_code == 200
    assert cp.get(f"/companyprofile/settings/{admin_only}").status_code == 400
    public_keys = {
        s["key"] for s in cast(list[dict[str, Any]], cp.get("/companyprofile/settings").json())
    }
    assert admin_only not in public_keys


def test_settings_are_readable_by_crud_admin_via_admin_route(
    cp: TestClient,
) -> None:
    admin_keys = {
        s["key"]
        for s in cast(
            list[dict[str, Any]], cp.get("/companyprofile/settings-admin").json()
        )
    }
    public_keys = {
        s["key"] for s in cast(list[dict[str, Any]], cp.get("/companyprofile/settings").json())
    }
    # Everything the public route exposes must also be readable by the admin,
    # otherwise the dashboard cannot display what it just wrote.
    assert public_keys <= admin_keys
    assert "whatsapp_number" in admin_keys