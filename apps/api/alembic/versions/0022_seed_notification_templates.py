"""0022 — seed notification templates (20 events)

Revision ID: 0022
Revises: 0021
Create Date: 2026-09-18

Seeds semua template notifikasi standar ke tabel notification_templates.
Idempotent: pakai INSERT OR REPLACE / ON CONFLICT DO NOTHING sesuai dialect.
"""

# ruff: noqa: E501

from sqlalchemy import text

from alembic import op  # type: ignore[attr-defined]

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None

# Format: (id, event_key, label, channel, email_subject, body)
TEMPLATES = [
    (
        "notiftmpl-0001-reg-welcome",
        "registration_welcome",
        "Registrasi Berhasil - Kredensial Akun",
        "both",
        "Selamat! Pendaftaran PPDB Anda Berhasil",
        "Assalamualaikum {nama_peserta},\n\nSelamat! Pendaftaran Anda di PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman telah *berhasil*.\n\n*Data Login Anda:*\n- Username : {username}\n- Password : {password}\n\nLogin: {link_login}\n\n*Langkah Selanjutnya:*\n1. Login ke akun Anda\n2. Lakukan pembayaran biaya pendaftaran\n3. Batas waktu: {batas_waktu_bayar}\n\nSimpan baik-baik kredensial ini.\n\nBarakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0002-payment-failed",
        "payment_failed",
        "Pembayaran Gagal",
        "both",
        "Pembayaran Biaya Pendaftaran PPDB Gagal",
        "Assalamualaikum {nama_peserta},\n\nPembayaran biaya pendaftaran Anda *gagal diproses*.\n\n- Nominal  : {nominal_bayar}\n- Alasan   : {alasan_gagal}\n\nSilakan coba lagi atau hubungi panitia.\n\nLink Pembayaran: {link_pembayaran}\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0003-payment-reminder",
        "payment_reminder_day7",
        "Reminder H-1 Batas Pembayaran",
        "both",
        "Besok Batas Akhir Pembayaran Pendaftaran!",
        "Assalamualaikum {nama_peserta},\n\n*PERINGATAN:* Besok adalah hari terakhir pembayaran!\n\n- Status       : Belum Bayar\n- Batas Waktu  : {batas_waktu_bayar}\n\nLink Pembayaran: {link_pembayaran}\n\nJika tidak bayar, akun Anda akan otomatis terhapus.\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0004-payment-expired",
        "payment_expired",
        "Akun Expired - Pembayaran Tidak Diselesaikan",
        "both",
        "Akun PPDB Anda Telah Kedaluwarsa",
        "Assalamualaikum {nama_peserta},\n\nMaaf, akun pendaftaran Anda telah *kedaluwarsa* karena pembayaran tidak diselesaikan.\n\nJika masih ingin mendaftar, silakan daftar ulang melalui website kami.\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0005-payment-success",
        "payment_success",
        "Pembayaran Berhasil Dikonfirmasi",
        "both",
        "Pembayaran Pendaftaran Berhasil Dikonfirmasi",
        "Assalamualaikum {nama_peserta},\n\nPembayaran biaya pendaftaran Anda telah *berhasil dikonfirmasi*!\n\n- Nominal : {nominal_bayar}\n- Status  : Lunas\n\nLogin dan lengkapi upload dokumen persyaratan.\n\nLogin: {link_login}\n\nBarakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0006-doc-reminder-3",
        "document_reminder_3days",
        "Reminder H-3 Upload Dokumen",
        "both",
        "3 Hari Lagi! Segera Lengkapi Dokumen",
        "Assalamualaikum {nama_peserta},\n\n*Pengingat:* Batas waktu upload dokumen tersisa *3 hari lagi!*\n\nPastikan semua dokumen sudah diunggah di akun Anda.\n\nLogin: {link_login}\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0007-doc-reminder-1",
        "document_reminder_1day",
        "Reminder H-1 Upload Dokumen",
        "both",
        "BESOK Batas Upload Dokumen!",
        "Assalamualaikum {nama_peserta},\n\n*BESOK* adalah batas akhir upload dokumen persyaratan!\n\nSegera lengkapi semua dokumen Anda sekarang.\n\nLogin: {link_login}\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0008-doc-rejected",
        "document_rejected",
        "Dokumen Ditolak - Perlu Diperbaiki",
        "both",
        "Dokumen Anda Perlu Diperbaiki",
        "Assalamualaikum {nama_peserta},\n\nDokumen persyaratan Anda *ditolak* oleh panitia dengan alasan:\n\n{alasan_penolakan}\n\nSilakan perbaiki dan upload ulang dokumen Anda.\n\nLogin: {link_login}\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0009-doc-approved",
        "document_approved",
        "Dokumen Disetujui",
        "both",
        "Dokumen Anda Telah Disetujui!",
        "Assalamualaikum {nama_peserta},\n\nDokumen persyaratan Anda telah *disetujui* oleh panitia!\n\nAnda akan masuk ke tahap seleksi. Pantau jadwal di akun Anda.\n\nLogin: {link_login}\n\nBarakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0010-sel-announced",
        "selection_announced",
        "Jadwal Seleksi Diumumkan",
        "both",
        "Jadwal Seleksi Masuk Telah Diumumkan",
        "Assalamualaikum {nama_peserta},\n\nJadwal seleksi masuk telah diumumkan!\n\n- Tanggal : {tanggal_seleksi}\n- Waktu   : {waktu_seleksi}\n- Lokasi  : {lokasi_seleksi}\n\nKetentuan: {ketentuan_seleksi}\n\nHadir tepat waktu!\n\nBarakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0011-sel-reminder-5",
        "selection_reminder_5days",
        "Reminder H-5 Seleksi",
        "both",
        "5 Hari Lagi - Persiapkan Diri untuk Seleksi",
        "Assalamualaikum {nama_peserta},\n\n*Pengingat:* Seleksi masuk *5 hari lagi!*\n\n- Tanggal : {tanggal_seleksi}\n- Lokasi  : {lokasi_seleksi}\n\nPersiapkan diri Anda dengan baik.\n\nBarakallahu fiikum",
    ),
    (
        "notiftmpl-0012-sel-reminder-1",
        "selection_reminder_1day",
        "Reminder H-1 Seleksi",
        "both",
        "BESOK - Hari Seleksi Masuk!",
        "Assalamualaikum {nama_peserta},\n\n*BESOK* adalah hari seleksi masuk!\n\n- Tanggal : {tanggal_seleksi}\n- Lokasi  : {lokasi_seleksi}\n\nBawa kartu identitas dan alat tulis.\n\nSemangat! Barakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0013-sel-passed",
        "selection_passed",
        "Hasil Seleksi - Dinyatakan Lulus",
        "both",
        "Selamat! Anda Dinyatakan Lulus Seleksi",
        "Assalamualaikum {nama_peserta},\n\n*Selamat!* Anda dinyatakan *LULUS* seleksi masuk!\n\nSegera lakukan daftar ulang sebelum batas waktu.\n\nDeadline Daftar Ulang: {deadline_daftar_ulang}\n\nLogin: {link_login}\n\nSelamat datang di keluarga besar PTDARRAHMAN!\nBarakallahu fiikum",
    ),
    (
        "notiftmpl-0014-sel-failed",
        "selection_failed",
        "Hasil Seleksi - Tidak Lulus",
        "both",
        "Pengumuman Hasil Seleksi PPDB",
        "Assalamualaikum {nama_peserta},\n\nTerima kasih telah mengikuti proses seleksi masuk.\n\nDengan penuh rasa hormat, kami sampaikan bahwa Anda *belum berhasil* pada seleksi kali ini.\n\nJangan menyerah. Semoga sukses di masa depan.\n\nBarakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0015-payment-manual",
        "payment_manual_approved",
        "Pembayaran Manual Diverifikasi Admin",
        "both",
        "Pembayaran Manual Anda Telah Diverifikasi",
        "Assalamualaikum {nama_peserta},\n\nPembayaran *offline/manual* Anda telah *diverifikasi* oleh admin!\n\n- Nominal : {nominal_bayar}\n- Status  : Lunas (Manual)\n\nLogin dan lengkapi upload dokumen.\n\nLogin: {link_login}\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0016-rereg-reminder",
        "reregistration_reminder",
        "Reminder Daftar Ulang",
        "both",
        "Reminder Daftar Ulang - Segera Selesaikan",
        "Assalamualaikum {nama_peserta},\n\nPengingat: Batas waktu *daftar ulang* semakin dekat!\n\nDeadline: {deadline_daftar_ulang}\n\nSegera selesaikan proses daftar ulang.\n\nLogin: {link_login}\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0017-rereg-success",
        "reregistration_success",
        "Daftar Ulang Berhasil",
        "both",
        "Daftar Ulang Berhasil!",
        "Assalamualaikum {nama_peserta},\n\n*Daftar ulang Anda telah berhasil diselesaikan!*\n\nSelamat bergabung secara resmi di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.\n\nBarakallahu fiikum\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0018-wave-closing",
        "wave_closing",
        "Gelombang Pendaftaran Akan Ditutup",
        "both",
        "Gelombang Pendaftaran Segera Ditutup",
        "Assalamualaikum,\n\nGelombang pendaftaran *{nama_gelombang}* akan segera ditutup!\n\nBatas Waktu: {batas_waktu_bayar}\n\nSegera daftarkan diri Anda sebelum pendaftaran ditutup.\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0019-user-created",
        "user_created",
        "Akun Admin Dibuat oleh Superadmin",
        "both",
        "Akun Admin PPDB Anda Telah Dibuat",
        "Assalamualaikum {nama_peserta},\n\nAkun admin Anda di sistem PPDB PTDARRAHMAN telah dibuat oleh Superadmin.\n\nData Login:\n- Username : {username}\n- Password : {password}\n- Link     : {link_login}\n\nSegera login dan ganti password Anda.\n\nPanitia PPDB PTDARRAHMAN",
    ),
    (
        "notiftmpl-0020-password-reset",
        "password_reset",
        "Password Akun Direset",
        "both",
        "Password Akun Anda Telah Direset",
        "Assalamualaikum {nama_peserta},\n\nPassword akun Anda ({username}) telah direset.\n\nPassword Baru: {password}\n\nLogin: {link_login}\n\nSegera login dan ganti password ke yang lebih aman.\n\nPanitia PPDB PTDARRAHMAN",
    ),
]


def upgrade() -> None:
    conn = op.get_bind()
    is_sqlite = conn.dialect.name == "sqlite"

    for tid, event_key, label, channel, email_subject, body in TEMPLATES:
        if is_sqlite:
            # SQLite: INSERT OR IGNORE based on primary key
            conn.execute(
                text(
                    "INSERT OR IGNORE INTO notification_templates"
                    " (id, event_key, label, channel, email_subject, body, is_active, created_at, updated_at)"
                    " VALUES (:id, :ek, :lb, :ch, :es, :bd, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
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
            # MySQL: INSERT IGNORE
            conn.execute(
                text(
                    "INSERT IGNORE INTO notification_templates"
                    " (id, event_key, label, channel, email_subject, body, is_active, created_at, updated_at)"
                    " VALUES (:id, :ek, :lb, :ch, :es, :bd, 1, NOW(), NOW())"
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


def downgrade() -> None:
    conn = op.get_bind()
    ids = [t[0] for t in TEMPLATES]
    for tid in ids:
        conn.execute(
            text("DELETE FROM notification_templates WHERE id = :id"),
            {"id": tid},
        )
