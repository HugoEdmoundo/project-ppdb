"""0023 — seed new notification templates (spec 2026)

Revision ID: 0023
Revises: 0022
Create Date: 2026-10-02

Tambah event_key baru berdasarkan spesifikasi notifikasi terbaru:
  - registration_account_created  → Pendaftaran akun berhasil (versi baru, sesuai spec)
  - payment_success_formulir      → Pembayaran formulir berhasil dikonfirmasi
  - wave_closed_pending_payment   → Gelombang ditutup, tagihan pending dibatalkan
  - payment_reminder_monday       → Pengingat bayar formulir setiap Senin
  - document_rejected_revision    → Dokumen ditolak (perlu revisi)
  - document_approved_non_tiu     → Dokumen disetujui (jalur bukan TIU)
  - tiu_exam_instructions         → Dokumen disetujui (jalur TIU) — instruksi ujian
  - tiu_result_ready              → Hasil TIU tersedia (via webhook Apps Script)
  - session_confirmed             → Jadwal ujian Tahfidz/Wawancara terkonfirmasi
  - tahfidz_score_recorded        → Nilai Tahfidz direkam, lanjut ke wawancara
  - interview_completed           → Wawancara selesai, menunggu pengumuman
  - selection_result_passed       → Lulus seleksi + instruksi DP
  - selection_result_failed       → Tidak lulus seleksi
  - dp_payment_reminder           → Pengingat bayar DP mingguan (3 bulan)
  - dp_payment_success            → Pembayaran DP berhasil + SKD + link grup WA
  - reminder_upload_docs_h3       → Pengingat upload dokumen H+3 setelah bayar
  - reminder_take_session_h2      → Pengingat pilih jadwal ujian H+2 setelah approve
  - reminder_exam_1hour           → Pengingat ujian 1 jam sebelum mulai
  - reminder_installment          → Pengingat cicilan bulanan

Idempotent: INSERT IGNORE / INSERT OR IGNORE.
Channel: whatsapp (semua — email tidak digunakan sesuai keputusan terbaru).
"""

# ruff: noqa: E501

from sqlalchemy import text

from alembic import op  # type: ignore[attr-defined]

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None

# Format: (id, event_key, label, channel, email_subject, body)
NEW_TEMPLATES = [
    # ── FASE 1: PENDAFTARAN AWAL & FORMULIR ─────────────────────────────────
    (
        "notiftmpl-1001-reg-account",
        "registration_account_created",
        "Pendaftaran Akun Berhasil (Spec Baru)",
        "whatsapp",
        None,
        "📢 *Pendaftaran Akun Berhasil!*\n\nAssalamu'alaikum / Halo *{nama_peserta}*,\nTerima kasih telah mendaftar di *{nama_sekolah}*. Akun PPDB Anda telah berhasil dibuat.\n\nBerikut adalah detail akses Anda:\n👤 Username: *{username}*\n🔑 Password: *{password}*\n🌐 Link Login: *{link_login}*\n\n⚠️ *Penting:*\nLangkah Anda selanjutnya adalah melakukan *Pembayaran Biaya Formulir*. Harap segera login ke sistem untuk melihat tagihan Anda. Batas akhir pembayaran formulir adalah sampai gelombang pendaftaran ditutup pada *{tanggal_tutup_gelombang}*.",
    ),
    (
        "notiftmpl-1002-payment-formulir-success",
        "payment_success_formulir",
        "Pembayaran Formulir Berhasil",
        "whatsapp",
        None,
        "✅ *Pembayaran Formulir Berhasil!*\n\nHalo *{nama_peserta}*,\nPembayaran formulir pendaftaran Anda telah kami terima. Terima kasih!\n\n📁 *Langkah Selanjutnya:*\nAnda sekarang sudah bisa mengunggah (upload) dokumen persyaratan. Harap persiapkan dokumen wajib (NISN, KK, Akte, Pas Foto) dan dokumen tambahan sesuai jalur pendaftaran Anda.\n\nSilakan login dan lengkapi dokumen Anda di sini: *{link_aplikasi}*",
    ),
    (
        "notiftmpl-1003-wave-closed-pending",
        "wave_closed_pending_payment",
        "Gelombang Ditutup — Tagihan Dibatalkan",
        "whatsapp",
        None,
        "❌ *Masa Pembayaran Formulir Telah Berakhir*\n\nHalo *{nama_peserta}*,\nMohon maaf, masa pembayaran formulir untuk Gelombang *{nama_gelombang}* telah resmi ditutup dan tagihan Anda otomatis dibatalkan.\n\nAnda boleh mendaftar lagi pada gelombang berikutnya jika tersedia, tetapi tidak wajib. Silakan cek informasi pendaftaran di *{link_aplikasi}*. Terima kasih.",
    ),
    (
        "notiftmpl-1004-payment-reminder-monday",
        "payment_reminder_monday",
        "Pengingat Bayar Formulir (Senin)",
        "whatsapp",
        None,
        "🔔 *PENGINGAT PEMBAYARAN FORMULIR*\n\nHalo *{nama_peserta}*, pembayaran formulir Anda masih belum kami terima. Silakan lanjutkan pembayaran sebelum gelombang *{nama_gelombang}* ditutup pada *{tanggal_tutup}*.\n\nLanjutkan pendaftaran: *{link_pembayaran}*\n\nAbaikan pesan ini jika Anda sudah membayar.",
    ),
    # ── FASE 2: VERIFIKASI DOKUMEN ─────────────────────────────────────────
    (
        "notiftmpl-1005-doc-rejected-revision",
        "document_rejected_revision",
        "Dokumen Ditolak — Perlu Revisi",
        "whatsapp",
        None,
        "⚠️ *Pemberitahuan Revisi Dokumen PPDB*\n\nHalo *{nama_peserta}*,\nTim kami telah memeriksa dokumen yang Anda unggah. Mohon maaf, dokumen Anda belum dapat divalidasi karena alasan berikut:\n\n❌ *{alasan_penolakan}*\n\n🔄 *Langkah Selanjutnya:*\nAgar dapat melanjutkan ke tahap Ujian, silakan login ke *{link_aplikasi}* dan unggah ulang dokumen perbaikan sesegera mungkin.",
    ),
    (
        "notiftmpl-1006-doc-approved-non-tiu",
        "document_approved_non_tiu",
        "Dokumen Disetujui (Jalur Bukan TIU)",
        "whatsapp",
        None,
        "✅ *Dokumen Disetujui!*\n\nHalo *{nama_peserta}*,\nAlhamdulillah, seluruh dokumen persyaratan Anda telah *valid dan disetujui*.\n\n📅 *Langkah Selanjutnya:*\nAnda sudah bisa memilih jadwal ujian. Silakan login ke *{link_aplikasi}* dan lakukan *Take Session* untuk *Ujian Tahfidz* sekarang.",
    ),
    (
        "notiftmpl-1007-tiu-exam-instructions",
        "tiu_exam_instructions",
        "Instruksi Ujian TIU (Jalur TIU)",
        "whatsapp",
        None,
        "✅ *Dokumen Disetujui!*\n\nHalo *{nama_peserta}*,\nAlhamdulillah, dokumen persyaratan Anda telah *valid*.\n\n📝 *Langkah Selanjutnya:*\nSebagai pendaftar jalur TIU, Anda perlu mengerjakan tes satu kali di aplikasi PPDB menggunakan Safe Exam Browser (SEB) pada komputer desktop/laptop Windows atau macOS. Google Form tidak dibuka oleh peserta. Silakan baca panduan instalasi dan penggunaan SEB di *{link_panduan_seb}*, lalu masuk ke dashboard untuk memulai tes.",
    ),
    # ── HASIL TIU ─────────────────────────────────────────────────────────
    (
        "notiftmpl-1008-tiu-result-ready",
        "tiu_result_ready",
        "Hasil TIU Tersedia (Webhook Apps Script)",
        "whatsapp",
        None,
        "✅ *HASIL TES TIU TERSEDIA*\n\nHalo *{nama_peserta}*, hasil tes TIU Anda sudah masuk ke sistem.\n\nNilai: *{nilai_tiu}*\n\nSilakan login ke aplikasi PPDB untuk melihat hasil dan tahapan berikutnya: *{link_aplikasi}*",
    ),
    # ── FASE 3: UJIAN & WAWANCARA ─────────────────────────────────────────
    (
        "notiftmpl-1009-session-confirmed",
        "session_confirmed",
        "Jadwal Ujian Terkonfirmasi",
        "whatsapp",
        None,
        "📅 *Jadwal Ujian Terkonfirmasi*\n\nHalo *{nama_peserta}*,\nJadwal untuk *{nama_ujian}* Anda telah berhasil diatur.\n\n📆 Tanggal: *{tanggal}*\n⏰ Waktu: *{jam_mulai} - {jam_selesai}*\n📍 Lokasi/Link: *{lokasi_atau_link}*\n\nHarap hadir/bergabung 15 menit sebelum waktu yang ditentukan. Semoga sukses!",
    ),
    (
        "notiftmpl-1010-tahfidz-score-recorded",
        "tahfidz_score_recorded",
        "Nilai Tahfidz Direkam",
        "whatsapp",
        None,
        "✅ *Ujian Tahfidz Selesai*\n\nHalo *{nama_peserta}*,\nNilai Ujian Tahfidz Anda telah berhasil direkam ke dalam sistem.\n\n🗣️ *Langkah Selanjutnya:*\nTahapan berikutnya adalah Wawancara. Akses untuk memilih jadwal wawancara kini telah dibuka. Silakan login ke *{link_aplikasi}* dan segera lakukan *Take Session* untuk Wawancara.",
    ),
    (
        "notiftmpl-1011-interview-completed",
        "interview_completed",
        "Wawancara Selesai — Menunggu Pengumuman",
        "whatsapp",
        None,
        "✅ *Rangkaian Seleksi Selesai!*\n\nHalo *{nama_peserta}*,\nAnda telah menyelesaikan seluruh rangkaian tes dan wawancara PPDB. Terima kasih atas usaha keras Anda.\n\nSaat ini, tim panitia sedang merekapitulasi seluruh nilai akhir Anda. Keputusan final (Pengumuman Kelulusan) akan segera diinformasikan melalui WhatsApp ini dan Dashboard Anda. Harap bersabar menunggu.",
    ),
    # ── FASE 4: KELULUSAN & PEMBAYARAN DP ────────────────────────────────
    (
        "notiftmpl-1012-selection-passed",
        "selection_result_passed",
        "Pengumuman Lulus Seleksi + Instruksi DP",
        "whatsapp",
        None,
        "🎉 *ALHAMDULILLAH, ANDA DINYATAKAN LULUS!*\n\nSelamat *{nama_peserta}*, Anda dinyatakan *LULUS* seleksi PPDB *{nama_sekolah}*!\n\nSurat Keterangan / *Letter of Acceptance (LoA)* Anda sudah dapat diunduh di dashboard pendaftaran.\n\n💳 *Langkah Final (Penting):*\nUntuk mengamankan kursi Anda, silakan login ke *{link_aplikasi}* dan lakukan pembayaran *Tahap 2 (DP)*. Anda memiliki batas waktu maksimal 3 BULAN sejak hari ini untuk melakukan pelunasan DP. Anda juga dapat mengatur skema cicilan untuk sisa tagihan di dalam aplikasi.\n\n*(Catatan: Sesuai ketentuan, seluruh dana yang telah dibayarkan tidak dapat dikembalikan)*",
    ),
    (
        "notiftmpl-1013-selection-failed",
        "selection_result_failed",
        "Pengumuman Tidak Lulus Seleksi",
        "whatsapp",
        None,
        "📢 *Pengumuman Hasil Seleksi PPDB*\n\nHalo *{nama_peserta}*,\nTerima kasih telah mengikuti seluruh rangkaian seleksi di *{nama_sekolah}* dengan sangat antusias.\n\nDengan berat hati kami sampaikan bahwa berdasarkan hasil rekapitulasi nilai, Anda *BELUM LULUS* pada penerimaan kali ini.\n\nJangan berkecil hati, tetap semangat belajar dan semoga Anda mendapatkan tempat pendidikan yang terbaik. Terima kasih.",
    ),
    (
        "notiftmpl-1014-dp-payment-reminder",
        "dp_payment_reminder",
        "Pengingat Bayar DP Mingguan",
        "whatsapp",
        None,
        "🔔 *PENGINGAT PEMBAYARAN TAHAP 2 (DP) PPDB*\n\nHalo *{nama_peserta}*,\nKami ingin mengingatkan kembali bahwa Anda telah dinyatakan LULUS, namun kami belum menerima pembayaran Tahap 2 (DP) Anda.\n\nUntuk mengamankan kursi pendaftaran Anda dan agar bisa bergabung ke Grup WhatsApp Angkatan, mohon segera melakukan pelunasan DP.\n\nBatas waktu maksimal pembayaran Anda tersisa: *{sisa_waktu}* pada tanggal *{tanggal_jatuh_tempo}*.\nAbaikan pesan ini jika Anda sedang dalam proses pembayaran. Silakan bayar di sini: *{link_aplikasi}*",
    ),
    (
        "notiftmpl-1015-dp-payment-success",
        "dp_payment_success",
        "Pembayaran DP Berhasil + SKD + Grup WA",
        "whatsapp",
        None,
        "✅ *PEMBAYARAN TAHAP 2 BERHASIL!*\n\nAlhamdulillah, Halo *{nama_peserta}*,\nPembayaran DP Anda telah kami terima. Anda kini *RESMI* menjadi bagian dari *{nama_sekolah}*!\n\n📄 Surat Keterangan Diterima (SKD) & No. Registrasi sudah dapat diunduh di dashboard.\n💳 Status Tagihan Cicilan: AKTIF.\n\n📱 *PENTING - GABUNG GRUP WHATSAPP:*\nSilakan bergabung ke Grup WhatsApp Resmi Calon Siswa/Santri melalui tautan berikut:\n*{link_grup_whatsapp}*\n\n*(Mohon tautan tidak disebar ke pihak luar)*",
    ),
    # ── FASE 5: PENGINGAT TAHAPAN LANJUTAN ───────────────────────────────
    (
        "notiftmpl-1016-reminder-upload-docs",
        "reminder_upload_docs_h3",
        "Pengingat Upload Dokumen H+3",
        "whatsapp",
        None,
        "🔔 *PENGINGAT UPLOAD DOKUMEN*\nHalo *{nama_peserta}*, pendaftaran Anda sudah aktif tapi Anda belum mengunggah dokumen wajib. Yuk, segera lengkapi di *{link_aplikasi}* agar bisa lanjut ke tahap ujian!",
    ),
    (
        "notiftmpl-1017-reminder-take-session",
        "reminder_take_session_h2",
        "Pengingat Pilih Jadwal Ujian H+2",
        "whatsapp",
        None,
        "🔔 *PENGINGAT PILIH JADWAL UJIAN*\nHalo *{nama_peserta}*, dokumen Anda sudah disetujui! Jangan biarkan jadwal penuh, segera pilih jadwal ujian Anda sekarang di *{link_aplikasi}*.",
    ),
    (
        "notiftmpl-1018-reminder-exam-1hour",
        "reminder_exam_1hour",
        "Pengingat Ujian 1 Jam Sebelum",
        "whatsapp",
        None,
        "🔔 *PENGINGAT UJIAN (1 JAM LAGI)*\n\nHalo *{nama_peserta}*,\nMengingatkan kembali bahwa Ujian *{nama_ujian}* Anda akan dimulai *1 jam lagi* pada pukul *{waktu}*.\n\n📍 *Detail/Link:* *{lokasi_atau_link}*\n\nHarap segera bersiap dan gabung/hadir 15 menit sebelum sesi dimulai. Semoga sukses!",
    ),
    (
        "notiftmpl-1019-reminder-installment",
        "reminder_installment",
        "Pengingat Cicilan Bulanan",
        "whatsapp",
        None,
        "🔔 *PENGINGAT TAGIHAN CICILAN*\nHalo *{nama_peserta}*, tagihan cicilan PPDB Anda (Periode *{bulan_cicilan}*) sejumlah *{nominal_cicilan}* akan jatuh tempo pada *{tanggal_jatuh_tempo}*. Silakan login ke *{link_aplikasi}* untuk melakukan pembayaran.",
    ),
]


def upgrade() -> None:
    conn = op.get_bind()
    is_sqlite = conn.dialect.name == "sqlite"

    for tid, event_key, label, channel, email_subject, body in NEW_TEMPLATES:
        if is_sqlite:
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
            # MySQL: INSERT IGNORE skips if event_key (UNIQUE) already exists
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

        # Also update channel to 'whatsapp' for any existing template
        # that still has 'both' or 'email' (compliance with spec: WA only)
        if not is_sqlite:
            conn.execute(
                text(
                    "UPDATE notification_templates SET channel = 'whatsapp', updated_at = NOW()"
                    " WHERE event_key = :ek AND channel != 'whatsapp'"
                ),
                {"ek": event_key},
            )


def downgrade() -> None:
    conn = op.get_bind()
    ids = [t[0] for t in NEW_TEMPLATES]
    for tid in ids:
        conn.execute(
            text("DELETE FROM notification_templates WHERE id = :id"),
            {"id": tid},
        )
