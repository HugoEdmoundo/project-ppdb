import json
from typing import Optional, Dict, Any, Callable
from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.core.security import verify_token
from src.core.database import get_by_id

security = HTTPBearer()

class AccessLevel:
    NONE = 'none'
    DASHBOARD = 'dashboard'
    READ = 'read'
    CRUD = 'crud'

class Module:
    COMPANYPROFILE = 'companyprofile'
    PPDB = 'ppdb'
    DASHBOARD = 'dashboard'

LEVEL_ORDER = [AccessLevel.NONE, AccessLevel.DASHBOARD, AccessLevel.READ, AccessLevel.CRUD]

async def has_module_access(
    user: Dict[str, Any],
    module: str,
    required: str = AccessLevel.DASHBOARD
) -> bool:
    if user.get("user_type") == "superadmin":
        return True

    profile = user.get("profile") or {}
    if isinstance(profile, str):
        try:
            profile = json.loads(profile)
        except:
            profile = {}

    overrides = profile.get("permissions_override", {})
    if module in overrides:
        try:
            idx = LEVEL_ORDER.index(overrides[module])
            if idx >= LEVEL_ORDER.index(required):
                return True
        except ValueError:
            pass

    role_id = user.get("role_id")
    if not role_id:
        return False

    role = get_by_id("roles", role_id)
    if not role:
        return False
    
    if role.get("is_superadmin"):
        return True

    raw_permissions = role.get("permissions")
    permissions = {}
    if isinstance(raw_permissions, str):
        try:
            permissions = json.loads(raw_permissions)
        except:
            pass
    elif isinstance(raw_permissions, dict):
        permissions = raw_permissions
        
    level_str = permissions.get(module, AccessLevel.NONE)
    try:
        level = LEVEL_ORDER.index(level_str)
        return level >= LEVEL_ORDER.index(required)
    except ValueError:
        return False

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = get_by_id("users", user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="User is inactive")

    role_id = user.get("role_id")
    if role_id:
        role = get_by_id("roles", role_id)
        if role and role.get("permissions"):
            raw_perms = role["permissions"]
            user["role_permissions"] = json.loads(raw_perms) if isinstance(raw_perms, str) else raw_perms

    return user

async def require_superadmin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("user_type") == "superadmin":
        return user
    
    role_id = user.get("role_id")
    if role_id:
        role = get_by_id("roles", role_id)
        if role and role.get("is_superadmin"):
            return user
            
    raise HTTPException(status_code=403, detail="Superadmin access required")

def require_module_access(module: str, required: str = AccessLevel.READ):
    async def _dependency(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if not await has_module_access(user, module, required):
            raise HTTPException(status_code=403, detail="Access denied")
        return user
    return _dependency

def require_cp_crud():
    return require_module_access(Module.COMPANYPROFILE, AccessLevel.CRUD)
