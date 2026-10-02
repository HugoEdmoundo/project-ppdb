"""Integration tests for the per-user page permission contract.

Verifies the canonical page keys exposed by `/modules/`, the login/profile
shape (`page_permissions` as page KEYS, not ids) used by the PPDB side-nav
and the companyprofile admin tabs, plus the id-based read/write endpoints
used by the superadmin panel.
"""

from collections.abc import Generator
from typing import Any, cast

import pytest
from fastapi.testclient import TestClient

from src.core.database import create_record, execute_raw
from src.core.security import hash_password
from src.main import app

PPDB_KEYS = {
    "dashboard",
    "data-pendaftar",
    "applicants",
    "selection",
    "mou",
    "payments",
    "diskonasi",
    "stage2-pembayaran",
    "periods",
    "notifications",
}
CP_KEYS = {
    "news",
    "programs",
    "facilities",
    "staff",
    "achievements",
    "gallery",
    "testimonials",
    "social",
    "contact",
    "settings",
}
LEGACY_KEYS = {
    "admin-dashboard",
    "ppdb-applicants",
    "ppdb-payments",
    "companyprofile-news",
}


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


def _login(client: TestClient, username: str, password: str) -> dict[str, Any]:
    resp = client.post("/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    return cast(dict[str, Any], resp.json())


def _page_ids_by_key(client: TestClient) -> dict[str, str]:
    resp = client.get("/modules/")
    assert resp.status_code == 200, resp.text
    mapping: dict[str, str] = {}
    for mod in resp.json():
        for page in mod["pages"]:
            mapping[page["key"]] = page["id"]
    return mapping


@pytest.fixture(scope="module")
def restricted_user(client: TestClient) -> Generator[str, None, None]:
    """Creates a plain admin bound to the `Admin PPDB` role."""
    role = execute_raw("SELECT id FROM roles WHERE name = 'Admin PPDB' LIMIT 1")[0][
        "id"
    ]
    user_id = "perm-user-1"
    create_record(
        "users",
        {
            "id": user_id,
            "username": "perm_user",
            "password_hash": hash_password("TesPass123"),
            "email": "perm@example.com",
            "phone": "",
            "full_name": "Perm User",
            "role_id": role,
            "user_type": "admin",
            "is_active": 1,
            "avatar_url": "",
            "failed_login_attempts": 0,
        },
    )
    yield user_id
    execute_raw("DELETE FROM users WHERE id = :id", {"id": user_id})


def test_seed_exposes_canonical_page_keys(client: TestClient) -> None:
    admin = _login(client, "superadmin", "SuperAdmin123!.")
    assert admin["user"]["is_superadmin"] is True

    keys = set(_page_ids_by_key(client))
    assert PPDB_KEYS <= keys
    assert CP_KEYS <= keys
    assert not keys & LEGACY_KEYS


def test_events_endpoint_requires_auth() -> None:
    with TestClient(app) as fresh:  # no cookies -> not authenticated
        resp = fresh.get("/users/some-user/events")
        assert resp.status_code == 401


def test_page_permissions_roundtrip_and_key_contract(
    client: TestClient, restricted_user: str
) -> None:
    _login(client, "superadmin", "SuperAdmin123!.")
    page_ids = _page_ids_by_key(client)
    picked = [page_ids["dashboard"], page_ids["periods"], page_ids["applicants"]]

    # superadmin assigns page permissions by id (superadmin panel contract)
    resp = client.put(
        f"/users/{restricted_user}/page-permissions", json={"page_ids": picked}
    )
    assert resp.status_code == 200, resp.text
    resp = client.get(f"/users/{restricted_user}/page-permissions")
    assert resp.status_code == 200
    assert sorted(resp.json()["page_ids"]) == sorted(picked)

    EXPECTED_KEYS = ["applicants", "dashboard", "periods"]

    # the restricted admin sees page KEYS on login and profiles
    data = _login(client, "perm_user", "TesPass123")
    assert data["user"]["permissions"] == {"ppdb": "crud"}
    assert sorted(data["user"]["page_permissions"]) == EXPECTED_KEYS

    resp = client.get("/auth/me")
    assert resp.status_code == 200
    assert sorted(resp.json()["page_permissions"]) == EXPECTED_KEYS

    resp = client.get("/companyprofile/auth/me")
    assert resp.status_code == 200
    assert sorted(resp.json()["page_permissions"]) == EXPECTED_KEYS

    # clearing the allow-list restores full access (empty array)
    _login(client, "superadmin", "SuperAdmin123!.")
    resp = client.put(
        f"/users/{restricted_user}/page-permissions", json={"page_ids": []}
    )
    assert resp.status_code == 200, resp.text

    _login(client, "perm_user", "TesPass123")
    resp = client.get("/auth/me")
    assert resp.status_code == 200
    assert resp.json()["page_permissions"] == []
