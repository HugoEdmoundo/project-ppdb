"""Regression tests for the companyprofile generic entity CRUD.

Covers the validation and side-effect contract that the raw-SQL generic router
is responsible for: column whitelisting, required fields on create only, slug
normalization and uniqueness, reserved path segments, error-code mapping, audit
trail, and the SSE change payload.

Runs against the throwaway SQLite database bootstrapped by `tests/conftest.py`.
"""

from collections.abc import Generator
from typing import Any, cast

import pytest
from fastapi.testclient import TestClient

from src.core.database import create_record, execute_raw, utcnow
from src.core.security import hash_password
from src.main import app

UID = "cp-crud-test-user"


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        create_record(
            "users",
            {
                "id": UID,
                "username": "cp_crud_tester",
                "password_hash": hash_password("TesPass123"),
                "email": "cp_crud@example.com",
                "phone": "",
                "full_name": "CRUD Tester",
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
    """Authenticated client. Logging in also proves the seeded DB is usable."""
    resp = client.post(
        "/companyprofile/auth/login",
        json={"username": "cp_crud_tester", "password": "TesPass123"},
    )
    assert resp.status_code == 200, resp.text
    assert cast(dict[str, Any], resp.json())
    yield client


# --------------------------------------------------------------------------
# Reserved path segments
# --------------------------------------------------------------------------

RESERVED = (
    "settings",
    "settings-admin",
    "contact-info",
    "auth",
    "upload",
    "uploads",
    "events",
    "admin",
    "stats",
)

# (method, path) pairs with no concrete route in router.py, so they reach the
# generic catch-alls and must be answered 404. Paths that exactly match a real
# GET route are answered 405 by Starlette and listed in MUST_405 below.
MUST_404: list[tuple[str, str]] = [
    ("POST", "/companyprofile/settings"),
    ("DELETE", "/companyprofile/settings/x"),
    ("POST", "/companyprofile/settings-admin"),
    ("DELETE", "/companyprofile/settings-admin/x"),
    ("GET", "/companyprofile/settings-admin/x"),
    ("POST", "/companyprofile/contact-info"),
    ("DELETE", "/companyprofile/contact-info/x"),
    ("GET", "/companyprofile/auth"),
    ("POST", "/companyprofile/auth"),
    ("PUT", "/companyprofile/auth/x"),
    ("DELETE", "/companyprofile/auth/x"),
    ("GET", "/companyprofile/upload"),
    ("GET", "/companyprofile/upload/x"),
    ("PUT", "/companyprofile/upload/x"),
    ("DELETE", "/companyprofile/upload/x"),
    ("GET", "/companyprofile/uploads"),
    ("GET", "/companyprofile/uploads/x"),
    ("POST", "/companyprofile/uploads"),
    ("PUT", "/companyprofile/uploads/x"),
    ("GET", "/companyprofile/events/x"),
    ("POST", "/companyprofile/events"),
    ("PUT", "/companyprofile/events/x"),
    ("DELETE", "/companyprofile/events/x"),
    ("GET", "/companyprofile/admin"),
    ("GET", "/companyprofile/admin/x"),
    ("POST", "/companyprofile/admin"),
    ("PUT", "/companyprofile/admin/x"),
    ("DELETE", "/companyprofile/admin/x"),
    ("GET", "/companyprofile/stats"),
    ("GET", "/companyprofile/stats/x"),
    ("POST", "/companyprofile/stats"),
    ("PUT", "/companyprofile/stats/x"),
    ("DELETE", "/companyprofile/stats/x"),
]


@pytest.mark.parametrize(("method", "path"), MUST_404)
def test_reserved_segment_not_found(cp: TestClient, method: str, path: str) -> None:
    resp = cp.request(method, path, json={})
    assert resp.status_code == 404, f"{method} {path} -> {resp.text}"
    assert "Unknown entity" not in resp.text


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("PUT", "/companyprofile/settings"),
        ("PUT", "/companyprofile/settings-admin"),
    ],
)
def test_reserved_segment_method_not_allowed(
    cp: TestClient, method: str, path: str
) -> None:
    # The path exists as a GET route, so Starlette reports a method mismatch
    # rather than falling through to the generic handler.
    assert cp.request(method, path, json={}).status_code == 405


def test_reserved_segment_never_reaches_generic_handler(cp: TestClient) -> None:
    """A reserved segment must never produce a generic-handler response body."""
    for seg in RESERVED:
        for method, path in (
            ("POST", f"/companyprofile/{seg}"),
            ("PUT", f"/companyprofile/{seg}/x"),
            ("DELETE", f"/companyprofile/{seg}/x"),
        ):
            resp = cp.request(method, path, json={"slug": "a", "evil": 1})
            assert "Unknown entity" not in resp.text, (method, path, resp.text)
            assert "Unknown fields" not in resp.text, (method, path, resp.text)


def test_unknown_entity_still_400(cp: TestClient) -> None:
    assert cp.get("/companyprofile/bogus").status_code == 400


# --------------------------------------------------------------------------
# Settings tab: readable at READ, writable only at CRUD
# --------------------------------------------------------------------------

READ_UID = "cp-crud-read-user"
READ_ROLE = "cp-crud-read-role"


@pytest.fixture(scope="module")
def reader() -> Generator[TestClient, None, None]:
    """A plain admin whose companyprofile access is exactly `read`.

    Models the admin that page-permission grants the `settings` page to but
    not CRUD -- the case that used to get a 403 on the whole tab.

    Deliberately its own TestClient: the session cookie lives on the client, so
    reusing the module-scoped `cp` one would silently demote every later test
    in this module to read-only.
    """
    execute_raw("DELETE FROM roles WHERE id = :i", {"i": READ_ROLE})
    execute_raw(
        "INSERT INTO roles "
        "(id, name, description, is_superadmin, is_system, permissions, "
        " created_at, updated_at) "
        "VALUES (:i, :n, '', 0, 0, :p, :now, :now)",
        {
            "i": READ_ROLE,
            "n": "CP Read Only",
            "p": '{"companyprofile": "read"}',
            "now": utcnow(),
        },
    )
    execute_raw("DELETE FROM users WHERE id = :i", {"i": READ_UID})
    create_record(
        "users",
        {
            "id": READ_UID,
            "username": "cp_read_tester",
            "password_hash": hash_password("TesPass123"),
            "email": "cp_read@example.com",
            "phone": "",
            "full_name": "CP Read Tester",
            "role_id": READ_ROLE,
            "user_type": "admin",
            "is_active": 1,
            "avatar_url": "",
            "failed_login_attempts": 0,
        },
    )
    with TestClient(app) as c:
        resp = c.post(
            "/companyprofile/auth/login",
            json={"username": "cp_read_tester", "password": "TesPass123"},
        )
        assert resp.status_code == 200, resp.text
        yield c
    execute_raw("DELETE FROM users WHERE id = :i", {"i": READ_UID})
    execute_raw("DELETE FROM roles WHERE id = :i", {"i": READ_ROLE})


def test_read_admin_can_list_admin_settings(reader: TestClient) -> None:
    """The Pengaturan tab must render read-only, not blow up with 403."""
    resp = reader.get("/companyprofile/settings-admin")
    assert resp.status_code == 200, resp.text
    keys = {s["key"] for s in cast(list[dict[str, Any]], resp.json())}
    # Includes the admin-only keys the public /settings route hides.
    assert {"to_email", "whatsapp_number"} <= keys


def test_read_admin_cannot_write_settings(reader: TestClient) -> None:
    """Widening the read gate must not widen the write gate."""
    assert (
        reader.put(
            "/companyprofile/settings/site_description", json={"value": "x"}
        ).status_code
        == 403
    )


def test_read_admin_can_read_content_tabs(reader: TestClient) -> None:
    assert reader.get("/companyprofile/news").status_code == 200


# --------------------------------------------------------------------------
# Request body errors
# --------------------------------------------------------------------------


def test_malformed_json_is_400_not_500(cp: TestClient) -> None:
    resp = cp.post(
        "/companyprofile/news",
        content=b"{not json",
        headers={"content-type": "application/json"},
    )
    assert resp.status_code == 400, resp.text


def test_empty_body_is_400(cp: TestClient) -> None:
    resp = cp.post(
        "/companyprofile/news",
        content=b"",
        headers={"content-type": "application/json"},
    )
    assert resp.status_code == 400, resp.text


def test_non_object_body_is_400(cp: TestClient) -> None:
    assert cp.post("/companyprofile/news", json=["a"]).status_code == 400


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("entity", "body", "missing"),
    [
        ("news", {"slug": "a"}, "category"),
        ("news", {"category": "c"}, "slug"),
        ("programs", {}, "slug"),
        ("facilities", {}, "category"),
        ("staff", {}, "role"),
        ("achievements", {}, "year"),
        ("gallery", {}, "category"),
        ("social-links", {"label": "IG", "href": "h"}, "path"),
        ("testimonials", {"name": "A"}, "child"),
    ],
)
def test_missing_required_field_is_422(
    cp: TestClient, entity: str, body: dict[str, Any], missing: str
) -> None:
    resp = cp.post(f"/companyprofile/{entity}", json=body)
    assert resp.status_code == 422, resp.text
    assert missing in resp.text


def test_blank_required_field_is_422(cp: TestClient) -> None:
    resp = cp.post("/companyprofile/news", json={"slug": "   ", "category": "c"})
    assert resp.status_code == 422, resp.text


def test_unknown_field_is_422(cp: TestClient) -> None:
    resp = cp.post("/companyprofile/news", json={"slug": "a", "category": "c", "x": 1})
    assert resp.status_code == 422, resp.text
    assert "x" in resp.text


def test_non_integer_year_is_422(cp: TestClient) -> None:
    resp = cp.post("/companyprofile/achievements", json={"year": "abc"})
    assert resp.status_code == 422, resp.text


def test_boolean_is_not_an_integer(cp: TestClient) -> None:
    # bool is a subclass of int in Python; accepting it would silently store 1.
    resp = cp.post("/companyprofile/achievements", json={"year": True})
    assert resp.status_code == 422, resp.text


def test_overlong_category_is_422(cp: TestClient) -> None:
    resp = cp.post(
        "/companyprofile/facilities", json={"category": "x" * 101, "image": "a.png"}
    )
    assert resp.status_code == 422, resp.text
    assert "100" in resp.text


def test_overlong_slug_is_422(cp: TestClient) -> None:
    resp = cp.post("/companyprofile/news", json={"slug": "a" * 300, "category": "c"})
    assert resp.status_code == 422, resp.text


def test_invalid_news_date_is_422(cp: TestClient) -> None:
    resp = cp.post(
        "/companyprofile/news",
        json={"slug": "a", "category": "c", "date": "05/03/2026"},
    )
    assert resp.status_code == 422, resp.text


# --------------------------------------------------------------------------
# Slug normalization and uniqueness
# --------------------------------------------------------------------------


def test_slug_is_normalized_on_create(cp: TestClient) -> None:
    resp = cp.post(
        "/companyprofile/news",
        json={"slug": "  Gelombang  Baru  2026 ", "category": "Uji"},
    )
    assert resp.status_code == 200, resp.text
    record = cast(dict[str, Any], resp.json())
    assert record["slug"] == "gelombang-baru-2026"
    cp.delete(f"/companyprofile/news/{record['id']}")


def test_duplicate_slug_is_409(cp: TestClient) -> None:
    first = cp.post(
        "/companyprofile/news", json={"slug": "slug-unik-a", "category": "Uji"}
    )
    assert first.status_code == 200, first.text
    nid = cast(dict[str, Any], first.json())["id"]
    try:
        # Same slug in different casing must still collide.
        dup = cp.post(
            "/companyprofile/news", json={"slug": "SLUG-UNIK-A", "category": "Lain"}
        )
        assert dup.status_code == 409, dup.text
    finally:
        cp.delete(f"/companyprofile/news/{nid}")


def test_same_slug_allowed_across_entities(cp: TestClient) -> None:
    """news and programs are separate tables; the check must not leak across."""
    news = cp.post(
        "/companyprofile/news", json={"slug": "bisa-bertabrakan", "category": "Uji"}
    )
    prog = cp.post("/companyprofile/programs", json={"slug": "bisa-bertabrakan"})
    assert news.status_code == 200, news.text
    assert prog.status_code == 200, prog.text
    cp.delete(f"/companyprofile/news/{news.json()['id']}")
    cp.delete(f"/companyprofile/programs/{prog.json()['id']}")


def test_updating_row_to_its_own_slug_is_allowed(cp: TestClient) -> None:
    created = cp.post(
        "/companyprofile/news", json={"slug": "slug-idempoten", "category": "Uji"}
    )
    nid = cast(dict[str, Any], created.json())["id"]
    try:
        for _ in range(2):
            resp = cp.put(
                f"/companyprofile/news/{nid}", json={"slug": "slug-idempoten"}
            )
            assert resp.status_code == 200, resp.text
        # Moving to a different, free slug is also fine.
        resp = cp.put(f"/companyprofile/news/{nid}", json={"slug": "slug-bertindah"})
        assert resp.status_code == 200, resp.text
    finally:
        cp.delete(f"/companyprofile/news/{nid}")


# --------------------------------------------------------------------------
# Partial update
# --------------------------------------------------------------------------


def test_partial_update_does_not_require_absent_fields(cp: TestClient) -> None:
    created = cp.post(
        "/companyprofile/testimonials",
        json={"name": "Bapak Uji", "child": "Anak Uji", "order": 2},
    )
    assert created.status_code == 200, created.text
    tid = cast(dict[str, Any], created.json())["id"]
    try:
        # name/child are absent; a NOT NULL column left untouched must not 422.
        resp = cp.put(f"/companyprofile/testimonials/{tid}", json={"image": "a.png"})
        assert resp.status_code == 200, resp.text
        body = cast(dict[str, Any], resp.json())
        assert body["image"] == "a.png"
        assert body["name"] == "Bapak Uji"
    finally:
        cp.delete(f"/companyprofile/testimonials/{tid}")


def test_create_fills_python_side_column_defaults(cp: TestClient) -> None:
    """`order` is NOT NULL with a SQLAlchemy default that raw INSERT bypasses."""
    created = cp.post(
        "/companyprofile/testimonials", json={"name": "Bapak Default", "child": "Anak"}
    )
    assert created.status_code == 200, created.text
    body = cast(dict[str, Any], created.json())
    try:
        assert body["order"] == 0
    finally:
        cp.delete(f"/companyprofile/testimonials/{body['id']}")


def test_partial_update_still_validates(cp: TestClient) -> None:
    created = cp.post(
        "/companyprofile/testimonials", json={"name": "Bapak Uji", "child": "Anak Uji"}
    )
    assert created.status_code == 200, created.text
    tid = cast(dict[str, Any], created.json())["id"]
    try:
        assert (
            cp.put(f"/companyprofile/testimonials/{tid}", json={"nope": 1}).status_code
            == 422
        )
        assert (
            cp.put(
                f"/companyprofile/testimonials/{tid}", json={"name": "y" * 300}
            ).status_code
            == 422
        )
    finally:
        cp.delete(f"/companyprofile/testimonials/{tid}")


def test_update_missing_row_is_404(cp: TestClient) -> None:
    assert (
        cp.put("/companyprofile/news/does-not-exist", json={"image": "a"}).status_code
        == 404
    )
    assert cp.delete("/companyprofile/news/does-not-exist").status_code == 404


# --------------------------------------------------------------------------
# Audit trail and change broadcast
# --------------------------------------------------------------------------


def test_create_update_delete_are_audited(cp: TestClient) -> None:
    created = cp.post(
        "/companyprofile/gallery", json={"category": "Kegiatan Uji", "image": "g.png"}
    )
    assert created.status_code == 200, created.text
    gid = cast(dict[str, Any], created.json())["id"]
    try:
        rows = execute_raw(
            "SELECT action, entity_type, entity_id FROM audit_log "
            "WHERE user_id = :u AND entity_id = :g",
            {"u": UID, "g": gid},
        )
        assert rows, "no audit row for create"
        assert rows[0]["action"] == "create"
        assert rows[0]["entity_type"] == "gallery"

        assert (
            cp.put(
                f"/companyprofile/gallery/{gid}", json={"image": "g2.png"}
            ).status_code
            == 200
        )
        actions = {
            r["action"]
            for r in execute_raw(
                "SELECT action FROM audit_log WHERE user_id = :u AND entity_id = :g",
                {"u": UID, "g": gid},
            )
        }
        assert "update" in actions, actions
    finally:
        assert cp.delete(f"/companyprofile/gallery/{gid}").status_code == 200

    actions = {
        r["action"]
        for r in execute_raw(
            "SELECT action FROM audit_log WHERE user_id = :u AND entity_id = :g",
            {"u": UID, "g": gid},
        )
    }
    assert "delete" in actions, actions


def test_change_broadcast_payload(cp: TestClient) -> None:
    """Subscribers need entity/id/action to avoid refetching every list."""
    from src.core.events import companyprofile_hub

    sent: list[dict[str, Any]] = []
    original = companyprofile_hub.broadcast
    companyprofile_hub.broadcast = lambda payload=None, **kw: sent.append(
        cast(dict[str, Any], payload if payload is not None else kw)
    )
    try:
        created = cp.post(
            "/companyprofile/staff", json={"role": "Guru Uji", "image": "s.png"}
        )
        assert created.status_code == 200, created.text
        sid = cast(dict[str, Any], created.json())["id"]
        assert sent[-1] == {
            "type": "change",
            "entity": "staff",
            "id": sid,
            "action": "create",
        }

        cp.put(f"/companyprofile/staff/{sid}", json={"role": "Guru Uji 2"})
        assert sent[-1]["action"] == "update"
        assert sent[-1]["id"] == sid

        cp.delete(f"/companyprofile/staff/{sid}")
        assert sent[-1]["action"] == "delete"
        assert sent[-1]["id"] == sid
    finally:
        companyprofile_hub.broadcast = original


def test_contact_info_update_broadcasts(cp: TestClient) -> None:
    """This route used to be the one CMS write that never broadcast."""
    from src.core.events import companyprofile_hub

    sent: list[dict[str, Any]] = []
    original = companyprofile_hub.broadcast
    companyprofile_hub.broadcast = lambda payload=None, **kw: sent.append(
        cast(dict[str, Any], payload if payload is not None else kw)
    )
    try:
        resp = cp.put("/companyprofile/contact-info", json={"phone_primary": "08123"})
        assert resp.status_code == 200, resp.text
        assert sent, "contact-info did not broadcast"
        assert sent[0]["entity"] == "contact-info"
        assert sent[0]["action"] == "update"
    finally:
        companyprofile_hub.broadcast = original


def test_audit_failure_does_not_fail_the_write(
    cp: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Auditing is best effort; losing the trail must not lose the data."""
    import src.modules.companyprofile.router as cp_router

    def boom(*args: Any, **kwargs: Any) -> None:
        raise RuntimeError("audit unavailable")

    monkeypatch.setattr(cp_router, "audit_log", boom)
    resp = cp.post(
        "/companyprofile/gallery", json={"category": "Uji", "image": "x.png"}
    )
    assert resp.status_code == 200, resp.text
    cp.delete(f"/companyprofile/gallery/{resp.json()['id']}")


# --------------------------------------------------------------------------
# Slug-based detail lookup (Phase 1 behaviour)
# --------------------------------------------------------------------------


def test_detail_by_slug_and_by_id(cp: TestClient) -> None:
    created = cp.post(
        "/companyprofile/programs",
        json={"slug": "detail-program", "content": '{"content": "isi"}'},
    )
    assert created.status_code == 200, created.text
    pid = cast(dict[str, Any], created.json())["id"]
    try:
        by_slug = cp.get("/companyprofile/programs/detail-program")
        assert by_slug.status_code == 200, by_slug.text
        assert cast(dict[str, Any], by_slug.json())["id"] == pid

        by_id = cp.get(f"/companyprofile/programs/{pid}")
        assert by_id.status_code == 200, by_id.text
        assert cast(dict[str, Any], by_id.json())["id"] == pid
    finally:
        cp.delete(f"/companyprofile/programs/{pid}")


def test_list_strips_heavy_content(cp: TestClient) -> None:
    created = cp.post(
        "/companyprofile/news",
        json={
            "slug": "strip-heavy",
            "category": "Uji",
            "content": '{"content": "paragraf panjang", "excerpt": "ringkas"}',
        },
    )
    assert created.status_code == 200, created.text
    nid = cast(dict[str, Any], created.json())["id"]
    try:
        items = cp.get("/companyprofile/news").json()
        row = next(i for i in items if i["id"] == nid)
        # List rows must not carry the article body; the detail endpoint has it.
        assert "content" not in row["content"]
        assert "excerpt" in row["content"]
    finally:
        cp.delete(f"/companyprofile/news/{nid}")
