from src.core.database import execute_raw

u = execute_raw("SELECT id FROM users LIMIT 1")
print(u[0]["id"])
