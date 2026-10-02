"""0032 — cleanup legacy notification templates

Revision ID: 0032
Revises: 0031
Create Date: 2026-10-02

Hapus template notifikasi lama yang sudah digantikan sepenuhnya oleh
sistem baru (spec notifikasi 2026). Template yang dihapus tidak lagi
dipicu oleh kode manapun.

Template yang DIHAPUS (ada padanan di spec baru):
  - registration_welcome     → diganti registration_account_created
  - payment_success          → diganti payment_success_formulir
  - document_rejected        → diganti document_rejected_revision
  - document_approved        → diganti document_approved_non_tiu / tiu_exam_instructions
  - selection_passed         → diganti selection_result_passed
  - selection_failed         → diganti selection_result_failed
  - payment_reminder_day7    → diganti payment_reminder_monday (setiap Senin)
  - document_reminder_3days  → diganti reminder_upload_docs_h3
  - document_reminder_1day   → tidak ada padanan langsung, dihapus (cron lama dihentikan)
  - selection_reminder_5days → tidak ada padanan di spec baru
  - selection_reminder_1day  → diganti reminder_exam_1hour (beda granularitas)
  - selection_announced      → tidak pernah dipicu, dihapus
  - wave_closing             → tidak pernah dipicu, dihapus
  - reregistration_reminder  → tidak pernah dipicu, dihapus
  - reregistration_success   → tidak pernah dipicu, dihapus
  - payment_manual_approved  → tidak pernah dipicu (sistem offline dihapus), dihapus

Template yang DIPERTAHANKAN:
  - payment_failed    → masih relevan (admin bisa kirim manual jika perlu)
  - payment_expired   → masih dipicu saat soft_delete_expired_applicants()
  - user_created      → domain superadmin, bukan PPDB
  - password_reset    → domain superadmin, bukan PPDB

Downgrade: restore semua template yang dihapus (dari data asli 0022).
"""

# ruff: noqa: E501

from sqlalchemy import text

from alembic import op  # type: ignore[attr-defined]

revision = "0032"
down_revision = "0031"
branch_labels = None
depends_on = None

# IDs dari migration 0022 yang akan dihapus
DELETE_IDS = [
    "notiftmpl-0001-reg-welcome",  # registration_welcome
    "notiftmpl-0005-payment-success",  # payment_success
    "notiftmpl-0008-doc-rejected",  # document_rejected
    "notiftmpl-0009-doc-approved",  # document_approved
    "notiftmpl-0013-sel-passed",  # selection_passed
    "notiftmpl-0014-sel-failed",  # selection_failed
    "notiftmpl-0003-payment-reminder",  # payment_reminder_day7
    "notiftmpl-0006-doc-reminder-3",  # document_reminder_3days
    "notiftmpl-0007-doc-reminder-1",  # document_reminder_1day
    "notiftmpl-0011-sel-reminder-5",  # selection_reminder_5days
    "notiftmpl-0012-sel-reminder-1",  # selection_reminder_1day
    "notiftmpl-0010-sel-announced",  # selection_announced
    "notiftmpl-0018-wave-closing",  # wave_closing
    "notiftmpl-0016-rereg-reminder",  # reregistration_reminder
    "notiftmpl-0017-rereg-success",  # reregistration_success
    "notiftmpl-0015-payment-manual",  # payment_manual_approved
]

# Data restore untuk downgrade (dari 0022) — hanya yang dihapus
RESTORE_TEMPLATES = [
    (
        "notiftmpl-0001-reg-welcome",
        "registration_welcome",
        "Registrasi Berhasil - Kredensial Akun",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\nSelamat! Pendaftaran Anda di PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman telah *berhasil*.\n\n*Data Login Anda:*\n- Username : {username}\n- Password : {password}\n\nLogin: {link_login}\n\n*Langkah Selanjutnya:*\n1. Login ke akun Anda\n2. Lakukan pembayaran biaya pendaftaran\n3. Batas waktu: {batas_waktu_bayar}\n\nSimpan baik-baik kredensial ini.\n\nBarakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0005-payment-success",
        "payment_success",
        "Pembayaran Berhasil Dikonfirmasi",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\nPembayaran biaya pendaftaran Anda telah *berhasil dikonfirmasi*!\n\n- Nominal : {nominal_bayar}\n- Status  : Lunas\n\nLogin dan lengkapi upload dokumen persyaratan.\n\nLogin: {link_login}\n\nBarakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0008-doc-rejected",
        "document_rejected",
        "Dokumen Ditolak - Perlu Diperbaiki",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\nDokumen persyaratan Anda *ditolak* oleh panitia dengan alasan:\n\n{alasan_penolakan}\n\nSilakan perbaiki dan upload ulang dokumen Anda.\n\nLogin: {link_login}\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0009-doc-approved",
        "document_approved",
        "Dokumen Disetujui",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\nDokumen persyaratan Anda telah *disetujui* oleh panitia!\n\nAnda akan masuk ke tahap seleksi. Pantau jadwal di akun Anda.\n\nLogin: {link_login}\n\nBarakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0013-sel-passed",
        "selection_passed",
        "Hasil Seleksi - Dinyatakan Lulus",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\n*Selamat!* Anda dinyatakan *LULUS* seleksi masuk!\n\nSegera lakukan daftar ulang sebelum batas waktu.\n\nDeadline Daftar Ulang: {deadline_daftar_ulang}\n\nLogin: {link_login}\n\nSelamat datang di keluarga besar PTDARRAHMAN!\nBarakallahu fiikum",
    ),
    (
        "notiftmpl-0014-sel-failed",
        "selection_failed",
        "Hasil Seleksi - Tidak Lulus",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\nTerima kasih telah mengikuti proses seleksi masuk.\n\nDengan penuh rasa hormat, kami sampaikan bahwa Anda *belum berhasil* pada seleksi kali ini.\n\nJangan menyerah. Semoga sukses di masa depan.\n\nBarakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0003-payment-reminder",
        "payment_reminder_day7",
        "Reminder H-1 Batas Pembayaran",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\n*PERINGATAN:* Besok adalah hari terakhir pembayaran!\n\n- Status       : Belum Bayar\n- Batas Waktu  : {batas_waktu_bayar}\n\nLink Pembayaran: {link_pembayaran}\n\nJika tidak bayar, akun Anda akan otomatis terhapus.\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0006-doc-reminder-3",
        "document_reminder_3days",
        "Reminder H-3 Upload Dokumen",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\n*Pengingat:* Batas waktu upload dokumen tersisa *3 hari lagi!*\n\nPastikan semua dokumen sudah diunggah di akun Anda.\n\nLogin: {link_login}\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0007-doc-reminder-1",
        "document_reminder_1day",
        "Reminder H-1 Upload Dokumen",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\n*BESOK* adalah batas akhir upload dokumen persyaratan!\n\nSegera lengkapi semua dokumen Anda sekarang.\n\nLogin: {link_login}\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0011-sel-reminder-5",
        "selection_reminder_5days",
        "Reminder H-5 Seleksi",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\n*Pengingat:* Seleksi masuk *5 hari lagi!*\n\n- Tanggal : {tanggal_seleksi}\n- Lokasi  : {lokasi_seleksi}\n\nPersiapkan diri Anda dengan baik.\n\nBarakallahu fiikum",
    ),
    (
        "notiftmpl-0012-sel-reminder-1",
        "selection_reminder_1day",
        "Reminder H-1 Seleksi",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\n*BESOK* adalah hari seleksi masuk!\n\n- Tanggal : {tanggal_seleksi}\n- Lokasi  : {lokasi_seleksi}\n\nBawa kartu identitas dan alat tulis.\n\nSemangat! Barakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0010-sel-announced",
        "selection_announced",
        "Jadwal Seleksi Diumumkan",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\nJadwal seleksi masuk telah diumumkan!\n\n- Tanggal : {tanggal_seleksi}\n- Waktu   : {waktu_seleksi}\n- Lokasi  : {lokasi_seleksi}\n\nHadir tepat waktu!\n\nBarakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0018-wave-closing",
        "wave_closing",
        "Gelombang Pendaftaran Akan Ditutup",
        "whatsapp",
        None,
        "Assalamualaikum,\n\nGelombang pendaftaran *{nama_gelombang}* akan segera ditutup!\n\nBatas Waktu: {batas_waktu_bayar}\n\nSegera daftarkan diri Anda sebelum pendaftaran ditutup.\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0016-rereg-reminder",
        "reregistration_reminder",
        "Reminder Daftar Ulang",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\nPengingat: Batas waktu *daftar ulang* semakin dekat!\n\nDeadline: {deadline_daftar_ulang}\n\nSegera selesaikan proses daftar ulang.\n\nLogin: {link_login}\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0017-rereg-success",
        "reregistration_success",
        "Daftar Ulang Berhasil",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\n*Daftar ulang Anda telah berhasil diselesaikan!*\n\nSelamat bergabung secara resmi di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.\n\nBarakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0015-payment-manual",
        "payment_manual_approved",
        "Pembayaran Manual Diverifikasi Admin",
        "whatsapp",
        None,
        "Assalamualaikum {nama_peserta},\n\nPembayaran *offline/manual* Anda telah *diverifikasi* oleh admin!\n\n- Nominal : {nominal_bayar}\n- Status  : Lunas (Manual)\n\nLogin dan lengkapi upload dokumen.\n\nLogin: {link_login}\n\nPanitia PPDB PTDARRAHMAN",
    ),
]


def upgrade() -> None:
    conn = op.get_bind()
    for tid in DELETE_IDS:
        conn.execute(
            text("DELETE FROM notification_templates WHERE id = :id"),
            {"id": tid},
        )


def downgrade() -> None:
    """Restore semua template yang dihapus (untuk rollback darurat)."""
    conn = op.get_bind()
    is_sqlite = conn.dialect.name == "sqlite"

    for tid, event_key, label, channel, email_subject, body in RESTORE_TEMPLATES:
        if is_sqlite:
            conn.execute(
                text(
                    "INSERT OR IGNORE INTO notification_templates"
                    " (id, event_key, label, channel, email_subject, body, is_active, created_at, updated_at)"
                    " VALUES (:id, :ek, :lb, :ch, :es, :bd, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                ),
                {
                    "id": tid,
                    "ek": event_key,
                    "lb": label,
                    "ch": channel,
                    "es": email_subject,
                    "bd": body,
                },
            )
        else:
            conn.execute(
                text(
                    "INSERT IGNORE INTO notification_templates"
                    " (id, event_key, label, channel, email_subject, body, is_active, created_at, updated_at)"
                    " VALUES (:id, :ek, :lb, :ch, :es, :bd, 0, NOW(), NOW())"
                ),
                {
                    "id": tid,
                    "ek": event_key,
                    "lb": label,
                    "ch": channel,
                    "es": email_subject,
                    "bd": body,
                },
            )
