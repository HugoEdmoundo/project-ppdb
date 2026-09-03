from typing import Any

from fastapi import APIRouter, Depends

from src.core.database import execute_raw
from src.core.dependencies import get_current_user

router = APIRouter()


@router.get("/")
async def list_modules(user: dict[str, Any] = Depends(get_current_user)):
    mod_rows = execute_raw("SELECT id, `key`, name FROM modules ORDER BY name")
    page_rows = execute_raw(
        "SELECT id, module_id, `key`, label, icon, sort_order FROM pages ORDER BY module_id, sort_order"
    )

    page_map = {}
    for p in page_rows:
        mid = p["module_id"]
        if mid not in page_map:
            page_map[mid] = []
        page_map[mid].append(
            {
                "id": p["id"],
                "key": p["key"],
                "label": p["label"],
                "icon": p["icon"],
                "sort_order": p["sort_order"],
            }
        )

    result = []
    for m in mod_rows:
        result.append(
            {
                "id": m["id"],
                "key": m["key"],
                "name": m["name"],
                "pages": page_map.get(m["id"], []),
            }
        )

    return result
