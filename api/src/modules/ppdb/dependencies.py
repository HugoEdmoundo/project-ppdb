from typing import Dict, Any
from fastapi import Depends
from src.core.dependencies import get_current_user, require_module_access, AccessLevel, Module

def require_auth() -> Dict[str, Any]:
    # Just an alias if needed, but it's better to use get_current_user directly
    return Depends(get_current_user)

require_ppdb_read = require_module_access(Module.PPDB, AccessLevel.READ)
require_ppdb_admin = require_module_access(Module.PPDB, AccessLevel.CRUD)
