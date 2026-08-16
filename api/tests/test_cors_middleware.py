"""Verify that unhandled 500 responses still carry CORS headers.

FastAPI's `@app.exception_handler(Exception)` is routed to Starlette's
ServerErrorMiddleware, which sits OUTSIDE CORSMiddleware, so its 500 responses
have no CORS headers and browsers report a misleading "blocked by CORS" error.
`src.core.middleware.ServerErrorJSONMiddleware` (registered BEFORE CORS) fixes
that by returning the 500 from inside the CORS middleware.
"""
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.core.config import Settings
from src.core.cors import setup_cors
from src.core.middleware import ServerErrorJSONMiddleware


def build_app() -> FastAPI:
    # Deterministic CORS config (ignore api/.env which may set CORS_ORIGINS=*).
    settings = Settings(_env_file=None, cors_origins="", cors_origin_regex="")
    app = FastAPI()
    app.add_middleware(ServerErrorJSONMiddleware)
    setup_cors(app, settings)

    @app.get("/boom")
    def boom():
        raise RuntimeError("boom")

    return app


def test_500_response_includes_cors_headers():
    client = TestClient(build_app())
    res = client.get("/boom", headers={"Origin": "https://ppdb-cct.pages.dev"})
    assert res.status_code == 500
    assert res.json() == {"detail": "Internal server error"}
    assert res.headers.get("access-control-allow-origin") == "https://ppdb-cct.pages.dev"
    assert res.headers.get("access-control-allow-credentials") == "true"


def test_500_response_omits_cors_for_disallowed_origin():
    client = TestClient(build_app())
    res = client.get("/boom", headers={"Origin": "https://evil.example.com"})
    assert res.status_code == 500
    assert "access-control-allow-origin" not in res.headers
