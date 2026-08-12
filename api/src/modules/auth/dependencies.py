from typing import Dict, Any
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from src.core.security import verify_token
from src.core.database import get_by_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def get_current_user(request: Request) -> Dict[str, Any]:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = auth[7:]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    user = get_by_id("users", user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="User is inactive")
        
    # Load role permissions into user object
    role_id = user.get("role_id")
    if role_id:
        role = get_by_id("roles", role_id)
        if role and role.get("permissions"):
            import json
            perms = role["permissions"]
            user["role_permissions"] = json.loads(perms) if isinstance(perms, str) else perms
            
    return user

def require_superadmin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("user_type") == "superadmin":
        return user
        
    role_id = user.get("role_id")
    if role_id:
        role = get_by_id("roles", role_id)
        if role and role.get("is_superadmin"):
            return user
            
    raise HTTPException(status_code=403, detail="Superadmin access required")
