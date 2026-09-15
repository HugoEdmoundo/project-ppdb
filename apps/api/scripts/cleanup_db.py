"""Destructive one-off cleanup for the local/dev database.

Removes all test/junk operational data while keeping:
  - seed data (modules, pages, roles, site_settings, notification_templates)
  - company-profile content (news, programs, facilities, staff, achievements,
    gallery, testimonials, social_links, contact_info)
  - the two official login accounts (`superadmin`, `admincompanyprofile`)

Also reconciles the permission structure onto the single-module layout:
modules = {ppdb, companyprofile}, roles = {Superadmin, Pendaftar,
Admin PPDB, AdminCP}, and re-parents pages accordingly.

Run from the `api/` directory:
    python -m scripts.cleanup_db

⚠️ DELETES DATA. Run against a backup if unsure.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.core.database import execute_raw  # noqa: E402

# ── Users to keep (official login accounts) ─────────────────────────────────
KEEP_USERNAMES = {"superadmin", "admincompanyprofile"}

# ── Canonical permission modules ─────────────────────────────────────────────
KEEP_MODULE_KEYS = {"ppdb", "companyprofile"}
KEEP_ROLE_NAMES = {"Superadmin", "Pendaftar", "Admin PPDB", "AdminCP"}

PPDB_PAGE_KEYS = {
    "admin-dashboard",
    "ppdb-periods",
    "ppdb-applicants",
    "ppdb-payments",
    "ppdb-selection",
}

ROLE_DEFS = {
    "Superadmin": {
        "description": "Full access to everything.",
        "is_superadmin": 1,
        "is_system": 1,
        "permissions": {},
    },
    "Pendaftar": {
        "description": "Default role for PPDB applicants.",
        "is_superadmin": 0,
        "is_system": 1,
        "permissions": {"ppdb": "dashboard"},
    },
    "Admin PPDB": {
        "description": (
            "Mengelola seluruh sistem PPDB "
            "(pendaftar, pembayaran, seleksi, notifikasi)."
        ),
        "is_superadmin": 0,
        "is_system": 0,
        "permissions": {"ppdb": "crud"},
    },
    "AdminCP": {
        "description": "Mengelola konten website (Company Profile).",
        "is_superadmin": 0,
        "is_system": 0,
        "permissions": {"companyprofile": "crud"},
    },
}


def _table_exists(table: str) -> bool:
    try:
        execute_raw(f"SELECT 1 FROM `{table}` LIMIT 0")
        return True
    except Exception:
        return False


def purge(table: str) -> None:
    if not _table_exists(table):
        print(f"  SKIP  {table:<36} (tidak ada)")
        return
    n = execute_raw(f"DELETE FROM `{table}`")
    print(f"  purge {table:<36} {n} rows")


def reconcile_modules_and_pages() -> dict[str, str]:
    mods = execute_raw("SELECT id, `key` FROM modules")
    keep_ids: dict[str, str] = {}
    delete_ids: list[str] = []
    for m in mods:
        if m["key"] in KEEP_MODULE_KEYS:
            keep_ids[m["key"]] = m["id"]
        else:
            delete_ids.append(m["id"])

    print(f"  modul dipertahankan: {sorted(keep_ids)}")
    removed = delete_ids and f"[{', '.join(f'id={d}' for d in delete_ids)}]" or "—"
    print(f"  modul dihapus:       {removed}")

    if not delete_ids:
        return keep_ids

    # Pindahkan page dari modul yang dihapus ke modul yang sesuai.
    keep_ids.get("ppdb")
    keep_ids.get("companyprofile")
    rows = execute_raw("SELECT id, module_id, `key` FROM pages")
    for p in rows:
        if p["module_id"] not in delete_ids:
            continue
        target = "ppdb" if p["key"] in PPDB_PAGE_KEYS else "companyprofile"
        new_mod = keep_ids.get(target)
        if new_mod:
            execute_raw(
                "UPDATE pages SET module_id = :mid WHERE id = :id",
                {"mid": new_mod, "id": p["id"]},
            )
            print(f"  page '{p['key']}' -> modul {target}")

    for mid in delete_ids:
        execute_raw("DELETE FROM modules WHERE id = :id", {"id": mid})
        print(f"  modul usang dihapus: {mid}")

    return keep_ids


def reconcile_roles_and_users() -> None:
    # Rename 'Admin' -> 'AdminCP' agar ikut definisi role resmi.
    admin = execute_raw("SELECT id FROM roles WHERE name = 'Admin' LIMIT 1")
    if admin:
        execute_raw(
            "UPDATE roles SET name = 'AdminCP', description = :d WHERE id = :id",
            {"d": ROLE_DEFS["AdminCP"]["description"], "id": admin[0]["id"]},
        )
        print("  role 'Admin' diubah nama menjadi 'AdminCP'")

    roles = execute_raw("SELECT id, name FROM roles")
    keep_ids: dict[str, str] = {}
    delete_ids: list[str] = []
    for r in roles:
        if r["name"] in KEEP_ROLE_NAMES:
            keep_ids[r["name"]] = r["id"]
            cfg = ROLE_DEFS[r["name"]]
            execute_raw(
                "UPDATE roles SET description = :d, is_superadmin = :sa, "
                "is_system = :sys, permissions = :perms WHERE id = :id",
                {
                    "d": cfg["description"],
                    "sa": cfg["is_superadmin"],
                    "sys": cfg["is_system"],
                    "perms": json.dumps(cfg["permissions"], ensure_ascii=False),
                    "id": r["id"],
                },
            )
            print(f"  role diselaraskan: {r['name']}")
        else:
            delete_ids.append(r["id"])

    for rid in delete_ids:
        execute_raw(
            "UPDATE users SET role_id = NULL WHERE role_id = :rid", {"rid": rid}
        )
        execute_raw("DELETE FROM roles WHERE id = :id", {"id": rid})
        print(f"  role usang dihapus: {rid}")

    # Pastikan akun resmi menunjuk role yang tepat.
    sa_role = keep_ids.get("Superadmin")
    cp_role = keep_ids.get("AdminCP")
    pendaftar_role = keep_ids.get("Pendaftar")

    if sa_role:
        execute_raw(
            "UPDATE users SET role_id = :rid WHERE user_type = 'superadmin'",
            {"rid": sa_role},
        )
        print("  user superadmin -> role Superadmin")
    if cp_role:
        execute_raw(
            "UPDATE users SET role_id = :rid WHERE username = 'admincompanyprofile'",
            {"rid": cp_role},
        )
        print("  user admincompanyprofile -> role AdminCP")
    if pendaftar_role:
        execute_raw(
            "UPDATE users SET role_id = :rid "
            "WHERE user_type = 'applicant' AND role_id IS NULL",
            {"rid": pendaftar_role},
        )
        print("  applicant user -> role Pendaftar")


def reconcile_and_purge() -> None:
    print("== Membersihkan data test / junk ==")

    # Logs & sesi
    purge("refresh_tokens")
    purge("notification_logs")
    purge("audit_log")
    purge("file_uploads")
    purge("rate_limits")

    # Seleksi (child dulu sebelum applicant)
    purge("selection_scores")
    purge("selection_results")
    purge("selection_criteria")
    purge("selection_categories")
    purge("selection_sessions")

    # Tahap 2 / MOU / pembayaran
    purge("ppdb_stage2_bills")
    purge("ppdb_applicants_discounts")
    purge("ppdb_mou")
    purge("ppdb_payment_transactions")
    purge("ppdb_wave_fee_items")

    # Pendaftar, gelombang, periode
    purge("ppdb_applicants")
    purge("ppdb_waves")
    purge("ppdb_periods")

    # User test (sisakan akun login resmi)
    rows = execute_raw("SELECT id, username FROM users")
    removed = 0
    for row in rows:
        if row["username"] not in KEEP_USERNAMES:
            execute_raw("DELETE FROM users WHERE id = :id", {"id": row["id"]})
            removed += 1
    print(
        f"  purge users                             {removed} rows "
        f"(sisakan {sorted(KEEP_USERNAMES)})"
    )

    print("== Menyelaraskan permission (module ppdb + companyprofile) ==")
    reconcile_modules_and_pages()
    reconcile_roles_and_users()
    print("Done.")


if __name__ == "__main__":
    reconcile_and_purge()
