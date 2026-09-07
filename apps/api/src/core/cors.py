"""Centralized CORS configuration.

Env vars (see api/.env.example):

  CORS_ORIGINS       comma-separated explicit allowlist.
                     "*"            = allow every origin (dev only; disabled creds).
                     empty/unset    = DEFAULT_ORIGINS + DEFAULT_ORIGIN_REGEX.
  CORS_ORIGIN_REGEX  optional extra origin regex (e.g. dynamic preview domains).

`allow_credentials` is enabled automatically unless the allowlist is "*" (browsers
reject wildcard origins when credentials are involved).
"""

import logging
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("ptdarrahman.cors")

# Explicit allowlist used when CORS_ORIGINS is empty/unset.
DEFAULT_ORIGINS: list[str] = []

# Covers every local dev port
DEFAULT_ORIGIN_REGEX = re.compile(r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$")


def resolve_cors(settings):
    """Return (origins: list[str], regex: re.Pattern | None, credentials: bool)."""
    raw = (settings.cors_origins or "").strip()
    extra_regex = (settings.cors_origin_regex or "").strip()

    if raw == "*":
        origins = ["*"]
        regex = re.compile(extra_regex) if extra_regex else None
        credentials = False
    elif raw:
        origins = [o.strip() for o in raw.split(",") if o.strip()]
        regex = re.compile(extra_regex) if extra_regex else None
        credentials = True
    else:
        origins = list(DEFAULT_ORIGINS)
        if extra_regex:
            regex = re.compile(f"(?:{DEFAULT_ORIGIN_REGEX.pattern})|(?:{extra_regex})")
        else:
            regex = DEFAULT_ORIGIN_REGEX
        credentials = True

    return origins, regex, credentials


def setup_cors(app: FastAPI, settings) -> None:
    """Attach a fully configured CORSMiddleware to the FastAPI app."""
    origins, regex, credentials = resolve_cors(settings)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=regex.pattern if regex else None,
        allow_credentials=credentials,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    logger.info(
        "CORS: origins=%s regex=%s credentials=%s",
        origins,
        regex.pattern if regex else None,
        credentials,
    )
