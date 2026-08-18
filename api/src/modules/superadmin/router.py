from fastapi import APIRouter, Depends
from typing import Any, Dict
from src.core.database import search_paginated
from src.core.dependencies import require_superadmin

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard(user: Dict[str, Any] = Depends(require_superadmin)):
    total_users_res = search_paginated("users", per_page=1)
    total_users = total_users_res.get("total", 0)
    
    total_roles_res = search_paginated("roles", per_page=1)
    total_roles = total_roles_res.get("total", 0)
    
    total_applicants_res = search_paginated("ppdb_applicants", per_page=1)
    total_applicants = total_applicants_res.get("total", 0)
    
    return {"total_users": total_users, "total_roles": total_roles, "total_applicants": total_applicants}
