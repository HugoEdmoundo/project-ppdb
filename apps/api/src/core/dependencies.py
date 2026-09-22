"""
apps/api/src/core/dependencies.py

FastAPI dependency functions for authentication and authorization.

User lookup uses a Redis cache (5-minute TTL) to avoid 2 DB hits per request.
Cache is invalidated automatically on profile/permission updates via
cache.invalidate_user_cache(user_id).
"""

import json
from collections.abc import Callable
from typing import Any

from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.cache import (  # noqa: F401
    cache_user,
    get_cached_user,
    invalidate_user_cache,
)
from src.core.database import get_by_id
from src.core.security import verify_token

security = HTTPBearer(auto_error=False)


class AccessLevel:
    NONE = "none"
    DASHBOARD = "dashboard"
    READ = "read"
    CRUD = "crud"


class Module:
    COMPANYPROFILE = "companyprofile"
    PPDB = "ppdb"
    DASHBOARD = "dashboard"


LEVEL_ORDER = [
    AccessLevel.NONE,
    AccessLevel.DASHBOARD,
    AccessLevel.READ,
    AccessLevel.CRUD,
]


def _parse_permissions(raw: Any) -> dict[str, Any]:
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw) if raw else {}
            return parsed if isinstance(parsed, dict) else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    return raw if isinstance(raw, dict) else {}


def _has_level(actual: str, required: str) -> bool:
    try:
        return LEVEL_ORDER.index(actual) >= LEVEL_ORDER.index(required)
    except ValueError:
        return False


async def has_module_access(
    user: dict[str, Any], module: str, required: str = AccessLevel.DASHBOARD
) -> bool:
    if user.get("user_type") == "superadmin":
        return True

    role_id = user.get("role_id")
    role: dict[str, Any] | None = None
    if role_id:
        role = get_by_id("roles", role_id)
        if role and role.get("is_superadmin"):
            return True

    # Per-user override stored in the `profile` JSON column.
    profile = user.get("profile") or {}
    if isinstance(profile, str):
        try:
            profile = json.loads(profile)
        except (json.JSONDecodeError, TypeError):
            profile = {}
    overrides = (
        profile.get("permissions_override", {}) if isinstance(profile, dict) else {}
    )
    if (
        isinstance(overrides, dict)
        and module in overrides
        and _has_level(str(overrides[module]), required)
    ):
        return True

    if role:
        permissions = _parse_permissions(role.get("permissions"))
        return _has_level(str(permissions.get(module, AccessLevel.NONE)), required)

    return False


def _load_user_fresh(user_id: str) -> dict[str, Any] | None:
    """Load user + role from DB and populate permission fields."""
    user = get_by_id("users", user_id)
    if not user:
        return None

    role_id = user.get("role_id")
    if role_id:
        role = get_by_id("roles", role_id)
        if role:
            user["role_permissions"] = _parse_permissions(role.get("permissions"))
            user["permissions"] = user["role_permissions"]
            user["is_superadmin"] = bool(role.get("is_superadmin"))
    if user.get("user_type") == "superadmin":
        user["is_superadmin"] = True

    return user


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict[str, Any]:
    # 1. Extract token from cookie or Authorization header
    token = request.cookies.get("access_token")
    if not token and credentials:
        token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 2. Verify JWT
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # 3. Try Redis cache first (avoids 2 DB queries per request)
    user = get_cached_user(user_id)
    if user is None:
        user = _load_user_fresh(user_id)
        if user:
            cache_user(user_id, user)

    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="User is inactive")

    return user


def require_superadmin(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if user.get("user_type") == "superadmin":
        return user
    role_id = user.get("role_id")
    if role_id:
        role = get_by_id("roles", role_id)
        if role and role.get("is_superadmin"):
            return user
    raise HTTPException(status_code=403, detail="Superadmin access required")


def require_module_access(module: str, required: str = AccessLevel.READ) -> Callable:
    async def _dependency(
        user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        if not await has_module_access(user, module, required):
            raise HTTPException(status_code=403, detail="Access denied")
        return user

    return _dependency


def require_cp_crud() -> Callable:
    return require_module_access(Module.COMPANYPROFILE, AccessLevel.CRUD)


async def require_ppdb_read(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if not await has_module_access(user, Module.PPDB, AccessLevel.READ):
        raise HTTPException(status_code=403, detail="Access denied")
    return user


async def require_ppdb_admin(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if not await has_module_access(user, Module.PPDB, AccessLevel.CRUD):
        raise HTTPException(status_code=403, detail="Access denied")
    return user


async def require_notification_admin(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if not await has_module_access(user, Module.PPDB, AccessLevel.CRUD):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Requires notification CRUD access",
        )
    return user


async def require_notification_read(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if not await has_module_access(user, Module.PPDB, AccessLevel.READ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Requires notification read access",
        )
    return user
