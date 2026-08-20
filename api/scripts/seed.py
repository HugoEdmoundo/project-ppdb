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
    update_record,
    execute_raw,
)
from src.core.security import hash_password  # noqa: E402

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
        "is_system": True,
        "permissions": {},
    },
    {
        "name": "Calon Murid",
        "description": "Default role for PPDB applicants.",
        "is_superadmin": False,
        "is_system": True,
        "permissions": {
            "applicant_dashboard": "dashboard",
        },
    },
    {
        "name": "Admin PPDB",
        "description": "Manages PPDB periods, waves and applicants.",
        "is_superadmin": False,
        "is_system": False,
        "permissions": {
            "dashboard": "dashboard",
            "ppdb": "crud",
            "payment": "read",
            "selection": "crud",
            "notification": "crud",
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

NOTIF_TEMPLATES = [
    {
        "event_key": "welcome",
        "label": "Selamat Datang & Kredensial Login",
        "channel": "both",
        "email_subject": "Selamat Datang di PPDB PT Darrahman",
        "body": (
            "Assalamu'alaikum Warahmatullahi Wabarakatuh,\n\n"
            "Halo {nama_peserta}, pendaftaran Anda telah kami terima.\n\n"
            "Berikut akun Anda untuk masuk ke sistem PPDB:\n"
            "  Username: {username}\n"
            "  Password: {password}\n"
            "  Link Login: {link_login}\n\n"
            "Segera lakukan pembayaran formulir pendaftaran sebelum {batas_waktu_bayar}.\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "account_created",
        "label": "Akun Panel Dibuat (Kredensial Login)",
        "channel": "both",
        "email_subject": "Akun Anda Telah Dibuat",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Akun Anda telah dibuat oleh admin. Berikut kredensial login Anda:\n"
            "  Username: {username}\n"
            "  Password: {password}\n"
            "  Link Login: {link_login}\n"
            "  Email: {email}\n"
            "  No. WhatsApp: {phone}\n\n"
            "Segera ganti password Anda setelah login pertama kali.\n\n"
            "Terima kasih,\nAdmin PT Darrahman"
        ),
    },
    {
        "event_key": "account_updated",
        "label": "Data Akun Diperbarui",
        "channel": "both",
        "email_subject": "Data Akun Anda Telah Diperbarui",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Data kontak akun Anda telah diperbarui oleh admin:\n"
            "  Username: {username}\n"
            "  Email: {email}\n"
            "  No. WhatsApp: {phone}\n\n"
            "Bila Anda tidak merasa melakukan perubahan ini, segera hubungi admin.\n\n"
            "Terima kasih,\nAdmin PT Darrahman"
        ),
    },
    {
        "event_key": "password_reset",
        "label": "Password Direset (Kredensial Baru)",
        "channel": "both",
        "email_subject": "Password Akun Anda Telah Direset",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Password akun Anda telah direset oleh admin. Berikut kredensial login terbaru:\n"
            "  Username: {username}\n"
            "  Password: {password}\n"
            "  Link Login: {link_login}\n\n"
            "Segera login dan ganti password Anda jika diperlukan.\n\n"
            "Terima kasih,\nAdmin PT Darrahman"
        ),
    },
    {
        "event_key": "payment_reminder",
        "label": "Pengingat Pembayaran Formulir (saat daftar)",
        "channel": "both",
        "email_subject": "Pembayaran Formulir Pendaftaran PPDB",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Kami mengingatkan untuk segera menyelesaikan pembayaran formulir pendaftaran PPDB "
            "sebelum {batas_waktu_bayar}. Pendaftaran Anda akan hangus jika melewati batas tersebut.\n\n"
            "Lakukan pembayaran melalui: {link_pembayaran}\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "payment_reminder_d7",
        "label": "Pengingat Pembayaran H-7",
        "channel": "both",
        "email_subject": "Pengingat: Pembayaran Formulir PPDB",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Kami mengingatkan bahwa batas pembayaran formulir pendaftaran Anda adalah "
            "{batas_waktu_bayar}. Segera selesaikan pembayaran agar pendaftaran tidak hangus.\n\n"
            "Lakukan pembayaran melalui: {link_pembayaran}\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "payment_success",
        "label": "Pembayaran Berhasil",
        "channel": "both",
        "email_subject": "Pembayaran Formulir PPDB Berhasil",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Pembayaran formulir pendaftaran Anda sebesar {nominal_bayar} telah kami terima. "
            "Anda kini dapat melanjutkan ke tahap upload dokumen persyaratan.\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "payment_failed",
        "label": "Pembayaran Gagal",
        "channel": "both",
        "email_subject": "Pembayaran Formulir PPDB Gagal",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Sayangnya pembayaran formulir pendaftaran Anda gagal diproses. Silakan coba lagi "
            "sebelum batas waktu {batas_waktu_bayar}.\n\n"
            "Lakukan pembayaran melalui: {link_pembayaran}\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "payment_expired",
        "label": "Pendaftaran Hangus",
        "channel": "both",
        "email_subject": "Pendaftaran PPDB Dinyatakan Hangus",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Kami mohon maaf, pendaftaran Anda dinyatakan hangus karena belum melakukan pembayaran "
            "formulir hingga batas waktu yang ditentukan. Silakan mendaftar kembali pada gelombang berikutnya.\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "document_reminder_d3",
        "label": "Pengingat Upload Dokumen H-3",
        "channel": "both",
        "email_subject": "Pengingat: Upload Dokumen PPDB (H-3)",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Batas waktu upload dokumen persyaratan {nama_gelombang} tinggal 3 hari lagi. "
            "Segera lengkapi dokumen Anda sebelum batas akhir.\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "document_reminder_d1",
        "label": "Pengingat Upload Dokumen H-1",
        "channel": "both",
        "email_subject": "Pengingat: Upload Dokumen PPDB (H-1)",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Batas waktu upload dokumen persyaratan {nama_gelombang} tinggal 1 hari lagi. "
            "Segera lengkapi dokumen Anda sebelum batas akhir.\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "document_approved",
        "label": "Dokumen Disetujui",
        "channel": "both",
        "email_subject": "Dokumen PPDB Anda Disetujui",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Selamat! Dokumen persyaratan Anda telah disetujui. Kami akan menginformasikan jadwal "
            "seleksi melalui email dan WhatsApp.\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "document_rejected",
        "label": "Dokumen Ditolak",
        "channel": "both",
        "email_subject": "Dokumen PPDB Anda Ditolak",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Mohon maaf, dokumen persyaratan Anda perlu diperbaiki.\n"
            "Alasan: {alasan_penolakan}\n\n"
            "Silakan perbaiki dan unggah ulang dokumen Anda.\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "selection_reminder_d5",
        "label": "Pengingat Seleksi H-5",
        "channel": "both",
        "email_subject": "Pengingat: Seleksi PPDB (H-5)",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Seleksi {nama_gelombang} akan dilaksanakan pada {tanggal_seleksi}. "
            "Persiapkan diri Anda dengan baik.\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "selection_reminder_d1",
        "label": "Pengingat Seleksi H-1",
        "channel": "both",
        "email_subject": "Pengingat: Seleksi PPDB (H-1)",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Seleksi {nama_gelombang} akan dilaksanakan besok, {tanggal_seleksi}. "
            "Pastikan Anda hadir tepat waktu.\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
    {
        "event_key": "selection_result",
        "label": "Pengumuman Hasil Seleksi",
        "channel": "both",
        "email_subject": "Hasil Seleksi PPDB",
        "body": (
            "Halo {nama_peserta},\n\n"
            "Pengumuman hasil seleksi PPDB telah dirilis. Silakan cek status Anda pada dashboard pendaftar.\n\n"
            "Terima kasih,\nPanitia PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
        ),
    },
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
            if not role.get("is_system"):
                print(f"  role exists:     {role['name']}")
                continue

            stored_perms = json.loads(existing.get("permissions") or "{}")
            if (
                stored_perms != role["permissions"]
                or existing.get("description") != role["description"]
                or bool(existing.get("is_superadmin")) != role["is_superadmin"]
                or bool(existing.get("is_system")) != role.get("is_system", False)
            ):
                update_record(
                    "roles",
                    existing["id"],
                    {
                        "description": role["description"],
                        "is_superadmin": 1 if role["is_superadmin"] else 0,
                        "is_system": 1 if role.get("is_system", False) else 0,
                        "permissions": json.dumps(role["permissions"], ensure_ascii=False),
                    },
                )
                print(f"  role updated:    {role['name']}")
            else:
                print(f"  role exists:     {role['name']}")
            continue
        create_record(
            "roles",
            {
                "id": str(uuid4()),
                "name": role["name"],
                "description": role["description"],
                "is_superadmin": 1 if role["is_superadmin"] else 0,
                "is_system": 1 if role.get("is_system", False) else 0,
                "permissions": json.dumps(role["permissions"], ensure_ascii=False),
            },
        )
        print(f"  role created:    {role['name']}")


def ensure_applicant_roles() -> None:
    """Assign the default 'Calon Murid' role to applicant users missing a role."""
    role = get_by_column("roles", "name", "Calon Murid")
    if not role:
        return
    rows = execute_raw("SELECT id FROM users WHERE user_type = 'applicant' AND role_id IS NULL")
    for row in rows:
        update_record("users", row["id"], {"role_id": role["id"]})
        print(f"  applicant role:  {row['id']} -> Calon Murid")


def ensure_superadmin() -> None:
    username = settings.seed_superadmin_username
    password = settings.seed_superadmin_password
    if not username or not password:
        print("  superadmin: skipped (SEED_SUPERADMIN_USERNAME/PASSWORD not set)")
        return

    existing = get_by_column("users", "username", username)
    if existing:
        print(f"  superadmin: exists ({username}) — password tidak diubah")
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
            "avatar_url": "",
            "phone": None,
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


def ensure_notification_templates() -> None:
    now = _now()
    for tpl in NOTIF_TEMPLATES:
        existing = get_by_column("notification_templates", "event_key", tpl["event_key"])
        if existing:
            print(f"  template exists:  {tpl['event_key']}")
            continue
        create_record(
            "notification_templates",
            {
                "id": str(uuid4()),
                "event_key": tpl["event_key"],
                "label": tpl["label"],
                "channel": tpl["channel"],
                "email_subject": tpl["email_subject"],
                "body": tpl["body"],
                "is_active": 1,
                "created_at": now,
                "updated_at": now,
            },
        )
        print(f"  template created: {tpl['event_key']}")


def main() -> None:
    print("Seeding database...")
    ensure_modules_and_pages()
    ensure_roles()
    ensure_applicant_roles()
    ensure_superadmin()
    ensure_site_settings()
    ensure_notification_templates()
    print("Done.")


if __name__ == "__main__":
    main()
