import asyncio
from src.core.notif_service import _async_send_custom_notifications
from src.core.database import execute_raw
async def main():
    u = execute_raw('SELECT id FROM users LIMIT 1')
    if u:
        res = await _async_send_custom_notifications([u[0]['id']], 'both', 'Test AI', 'Berjalan kah?', 'custom')
        print(res)
asyncio.run(main())
