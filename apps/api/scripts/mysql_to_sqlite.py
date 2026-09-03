"""
mysql_to_sqlite.py — Export MySQL production → SQLite lokal (dev.db)
Jalankan dari folder api/:  python3 scripts/mysql_to_sqlite.py
"""

import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

MYSQL_HOST = "srv1322.hstgr.io"
MYSQL_PORT = 3306
MYSQL_USER = "u868325204_devptd"
MYSQL_PASSWORD = "Tahfiz_IT100%!!"
MYSQL_DATABASE = "u868325204_ptdarrahman"
SQLITE_URL = "sqlite:///./dev.db"

SKIP_TABLES = {"refresh_tokens", "rate_limits", "audit_log"}


def get_mysql_engine():
    from sqlalchemy import URL, create_engine

    url = URL.create(
        "mysql+pymysql",
        username=MYSQL_USER,
        password=MYSQL_PASSWORD,
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        database=MYSQL_DATABASE,
    )
    return create_engine(url, connect_args={"charset": "utf8mb4"})


def get_sqlite_engine():
    from sqlalchemy import create_engine
    from sqlalchemy.pool import StaticPool

    return create_engine(
        SQLITE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool
    )


def serialize(val):
    if val is None:
        return None
    if isinstance(val, (datetime.datetime, datetime.date)):
        return str(val)
    if isinstance(val, bytes):
        try:
            return val.decode("utf-8")
        except:
            return val.hex()
    if isinstance(val, dict):
        return json.dumps(val, ensure_ascii=False)
    return val


def migrate():
    from sqlalchemy import inspect, text

    print("\n🔌 Connecting to MySQL production...")
    mysql_eng = get_mysql_engine()
    sqlite_eng = get_sqlite_engine()

    with mysql_eng.connect() as mc:
        tables = [
            t for t in inspect(mysql_eng).get_table_names() if t not in SKIP_TABLES
        ]
        print(f"   {len(tables)} tables to migrate (skipping: {SKIP_TABLES})\n")

        for table in tables:
            try:
                count = mc.execute(text(f"SELECT COUNT(*) FROM `{table}`")).scalar()
                if count == 0:
                    print(f"  ⏭  {table:<35} empty")
                    continue

                rows = mc.execute(text(f"SELECT * FROM `{table}`"))
                cols = list(rows.keys())
                data = rows.fetchall()

                with sqlite_eng.connect() as sc:
                    sc.execute(text(f"DELETE FROM `{table}`"))
                    ok = err = 0
                    for row in data:
                        rd = {c: serialize(v) for c, v in zip(cols, row)}
                        try:
                            col_str = ", ".join(f"`{c}`" for c in rd)
                            ph_str = ", ".join(f":{c}" for c in rd)
                            sc.execute(
                                text(
                                    f"INSERT OR REPLACE INTO `{table}` ({col_str}) VALUES ({ph_str})"
                                ),
                                rd,
                            )
                            ok += 1
                        except Exception as e:
                            err += 1
                            if err <= 2:
                                print(f"     ⚠  row error: {e}")
                    sc.commit()

                icon = "✅" if err == 0 else "⚠️ "
                note = f"({err} errors)" if err else ""
                print(f"  {icon} {table:<35} {ok:>5} rows  {note}")
            except Exception as e:
                print(f"  ❌ {table:<35} FAILED: {e}")

    print("\n✅ Done! Data production sudah masuk ke dev.db")
    print("   Username & password = sama seperti di production\n")


if __name__ == "__main__":
    migrate()
