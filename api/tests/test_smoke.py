import pytest
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def test_health(client: TestClient):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_root(client: TestClient):
    res = client.get("/")
    assert res.status_code == 200
    assert "version" in res.json()


def test_scalar_docs_available(client: TestClient):
    res = client.get("/scalar")
    assert res.status_code == 200


def test_me_requires_auth(client: TestClient):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/users/").status_code == 401
    assert client.get("/modules/").status_code == 401


def test_companyprofile_public_endpoints(client: TestClient):
    assert client.get("/companyprofile/settings").status_code == 200
    assert client.get("/companyprofile/news").status_code == 200


def test_ppdb_requires_auth(client: TestClient):
    assert client.get("/ppdb/periods").status_code == 401
