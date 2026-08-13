"""Idempotent database seeder.

Run from the `api/` directory:
    python -m scripts.seed

Creates (only if missing):
  - modules & pages for the superadmin/ppdb permission system
  - default roles ("Superadmin", "Calon Murid", "Admin PPDB")
  - the superadmin user (credentials from SEED_SUPERADMIN_* env vars)
  - default site_settings keys

Safe to run repeatedly.
"""
import json
import sys
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.core.config import settings  # noqa: E402
from src.core.database import (  # noqa: E402
    get_by_column,
    get_by_id,
    create_record,
    execute_raw,
    update_record,
)
from src.core.security import hash_password, verify_password  # noqa: E402

MODULES = {
    "companyprofile": "Company Profile",
    "ppdb": "PPDB",
    "payment": "Payment",
    "selection": "Selection",
    "notification": "Notification",
    "dashboard": "Dashboard",
    "applicant_dashboard": "Applicant Dashboard",
}

PAGES = {
    "ppdb": [
        ("ppdb-periods", "Periode PPDB", "CalendarDays", 10),
        ("ppdb-applicants", "Calon Murid", "Users", 20),
        ("ppdb-payments", "Pembayaran", "Wallet", 30),
        ("ppdb-selection", "Seleksi", "ClipboardCheck", 40),
    ],
    "companyprofile": [
        ("companyprofile-news", "Berita", "Newspaper", 10),
        ("companyprofile-programs", "Program", "BookOpen", 20),
        ("companyprofile-settings", "Pengaturan", "Settings", 30),
    ],
    "dashboard": [
        ("admin-dashboard", "Dashboard Admin", "LayoutDashboard", 10),
    ],
}

DEFAULT_ROLES = [
    {
        "name": "Superadmin",
        "description": "Full access to everything.",
        "is_superadmin": True,
        "permissions": {},
    },
    {
        "name": "Calon Murid",
        "description": "Default role for PPDB applicants.",
        "is_superadmin": False,
        "permissions": {
            "applicant_dashboard": "dashboard",
            "ppdb": "read",
        },
    },
    {
        "name": "Admin PPDB",
        "description": "Manages PPDB periods, waves and applicants.",
        "is_superadmin": False,
        "permissions": {
            "dashboard": "dashboard",
            "ppdb": "crud",
            "payment": "read",
            "selection": "crud",
        },
    },
]

SITE_SETTINGS = [
    ("site_name", "PT Darrahman"),
    ("site_description", "Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"),
    ("favicon", ""),
    ("logo", ""),
    ("whatsapp", ""),
    ("whatsapp_number", ""),
    ("whatsapp_message", ""),
    ("whatsapp_message_id", ""),
    ("whatsapp_message_en", ""),
    ("to_email", ""),
]


def _now() -> str:
    from src.core.database import utcnow

    return utcnow()


def ensure_modules_and_pages() -> None:
    now = _now()
    for key, name in MODULES.items():
        mod = get_by_column("modules", "key", key)
        if not mod:
            mod = create_record(
                "modules",
                {"id": str(uuid4()), "key": key, "name": name, "created_at": now, "updated_at": now},
            )
            print(f"  module created: {key}")
        else:
            print(f"  module exists:   {key}")

        for page_key, label, icon, sort_order in PAGES.get(key, []):
            existing = execute_raw(
                "SELECT id FROM pages WHERE module_id = :mid AND `key` = :k",
                {"mid": mod["id"], "k": page_key},
            )
            if not existing:
                create_record(
                    "pages",
                    {
                        "id": str(uuid4()),
                        "module_id": mod["id"],
                        "key": page_key,
                        "label": label,
                        "icon": icon,
                        "sort_order": sort_order,
                        "created_at": now,
                        "updated_at": now,
                    },
                )
                print(f"  page created:    {page_key}")


def ensure_roles() -> None:
    for role in DEFAULT_ROLES:
        existing = get_by_column("roles", "name", role["name"])
        if existing:
            print(f"  role exists:     {role['name']}")
            continue
        create_record(
            "roles",
            {
                "id": str(uuid4()),
                "name": role["name"],
                "description": role["description"],
                "is_superadmin": 1 if role["is_superadmin"] else 0,
                "permissions": json.dumps(role["permissions"], ensure_ascii=False),
            },
        )
        print(f"  role created:    {role['name']}")


def ensure_superadmin() -> None:
    username = settings.seed_superadmin_username
    password = settings.seed_superadmin_password
    if not username or not password:
        print("  superadmin: skipped (SEED_SUPERADMIN_USERNAME/PASSWORD not set)")
        return

    existing = get_by_column("users", "username", username)
    if existing:
        stored = existing.get("password_hash") or ""
        if not verify_password(password, stored):
            update_record(
                "users",
                existing["id"],
                {"password_hash": hash_password(password)},
            )
            print(f"  superadmin: password reset ({username})")
        else:
            print(f"  superadmin: exists ({username})")
        return

    role = get_by_column("roles", "name", "Superadmin")
    role_id = role["id"] if role else None
    now = _now()
    create_record(
        "users",
        {
            "id": str(uuid4()),
            "username": username,
            "email": settings.seed_superadmin_email or "",
            "password_hash": hash_password(password),
            "role_id": role_id,
            "user_type": "superadmin",
            "full_name": "Super Admin",
            "is_active": 1,
            "created_at": now,
            "updated_at": now,
        },
    )
    print(f"  superadmin: created ({username})")


def ensure_site_settings() -> None:
    for key, value in SITE_SETTINGS:
        if not get_by_column("site_settings", "key", key):
            create_record("site_settings", {"key": key, "value": value})
            print(f"  setting created: {key}")


def main() -> None:
    print("Seeding database...")
    ensure_modules_and_pages()
    ensure_roles()
    ensure_superadmin()
    ensure_site_settings()
    print("Done.")


if __name__ == "__main__":
    main()
