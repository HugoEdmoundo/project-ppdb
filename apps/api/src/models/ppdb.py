from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class PPDBPeriod(Base):
    __tablename__ = "ppdb_periods"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    academic_year: Mapped[str | None] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="inactive")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBWave(Base):
    __tablename__ = "ppdb_waves"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    period_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("ppdb_periods.id", ondelete="CASCADE")
    )
    wave_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # Scope gelombang: nilai dipisah koma
    allowed_paths: Mapped[str] = mapped_column(
        String(50), default="reguler,prestasi,tahfidz,rapot"
    )
    allowed_levels: Mapped[str] = mapped_column(String(100), default="SMK")
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    registration_start_date: Mapped[date | None] = mapped_column(Date)
    registration_end_date: Mapped[date | None] = mapped_column(Date)
    document_upload_end_date: Mapped[date | None] = mapped_column(Date)
    selection_date: Mapped[date | None] = mapped_column(Date)
    quota: Mapped[int] = mapped_column(Integer, default=0)
    early_discount_quota: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    registration_fee: Mapped[int] = mapped_column(BigInteger, default=0)
    second_stage_fee: Mapped[int] = mapped_column(BigInteger, default=0)
    minimum_dp: Mapped[int] = mapped_column(BigInteger, default=0)
    mou_template: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="inactive")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBApplicant(Base):
    __tablename__ = "ppdb_applicants"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    wave_id: Mapped[str] = mapped_column(String(50), ForeignKey("ppdb_waves.id"))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE")
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    registration_path: Mapped[str] = mapped_column(String(50), nullable=False)
    birth_place: Mapped[str | None] = mapped_column(String(100))
    birth_date: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(10))
    nisn: Mapped[str | None] = mapped_column(String(50))
    nik: Mapped[str | None] = mapped_column(String(50))
    parent_name: Mapped[str | None] = mapped_column(String(255))
    previous_school: Mapped[str | None] = mapped_column(String(255))
    province: Mapped[str | None] = mapped_column(String(100))
    city: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))
    village: Mapped[str | None] = mapped_column(String(100))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text)
    disease_history: Mapped[str | None] = mapped_column(Text)
    # status alur pendaftaran: pending_payment | paid | document_uploaded |
    #   document_approved | document_rejected | selection | passed | failed | expired
    status: Mapped[str] = mapped_column(String(50), default="pending_payment")
    # ── Payment tracking ──────────────────────────────────────────────────────
    # payment_status: pending | paid | failed | expired
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    # Batas waktu bayar = created_at + 7 hari (diisi saat register)
    payment_deadline: Mapped[datetime | None] = mapped_column(DateTime)
    # ── Soft Delete (Hari ke-8 belum bayar → cron job set deleted_at) ────────
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    # Alasan penolakan dokumen (diisi admin saat verifikasi; NULL saat
    # belum/sudah disetujui)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class TIUResult(Base):
    """Idempotent server record of the automatically graded TIU result."""

    __tablename__ = "tiu_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ppdb_applicants.id", ondelete="CASCADE"), unique=True
    )
    attempt_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    idempotency_key: Mapped[str] = mapped_column(
        String(200), unique=True, nullable=False
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class FileUpload(Base):
    __tablename__ = "file_uploads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    uploaded_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE")
    )
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    public_url: Mapped[str | None] = mapped_column(String(500))
    entity_type: Mapped[str | None] = mapped_column(String(50))
    entity_id: Mapped[str | None] = mapped_column(String(50))
    data: Mapped[bytes | None] = mapped_column(LargeBinary(length=16777215))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class RateLimit(Base):
    __tablename__ = "rate_limits"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    timestamp: Mapped[int] = mapped_column(BigInteger, primary_key=True)


# ─────────────────────────────────────────────────────────────────────────────
# PPDB Payment Transactions (Formulir Pendaftaran)
# ─────────────────────────────────────────────────────────────────────────────


class PPDBPaymentTransaction(Base):
    """Rekam jejak setiap transaksi pembayaran formulir PPDB.

    Satu applicant bisa punya lebih dari 1 baris (misal bayar gagal lalu retry).
    Status transaksi:
      pending  → transaksi dibuat, belum ada konfirmasi
      success  → dikonfirmasi (manual admin ATAU webhook PG)
      failed   → PG callback FAILED / DENIED
      expired  → PG callback EXPIRED / tidak dikonfirmasi admin dalam batas waktu
      cancelled → dibatalkan oleh user / admin
    """

    __tablename__ = "ppdb_payment_transactions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ppdb_applicants.id", ondelete="CASCADE")
    )
    # Metode: offline (cash ke panitia) | online (payment gateway / simulator)
    method: Mapped[str] = mapped_column(String(20), default="offline")
    amount: Mapped[int] = mapped_column(BigInteger, default=0)
    # Status transaksi: pending | success | failed | expired | cancelled
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # Referensi order/invoice dari PG (nullable untuk metode offline)
    external_id: Mapped[str | None] = mapped_column(String(100))
    # Raw payload dari webhook PG (JSON string)
    gateway_payload: Mapped[str | None] = mapped_column(Text)
    # Alasan gagal (untuk notif ke pendaftar)
    failure_reason: Mapped[str | None] = mapped_column(Text)
    # URL bukti transfer / kwitansi (untuk metode offline)
    proof_url: Mapped[str | None] = mapped_column(Text)
    # Admin yang mengkonfirmasi (untuk metode offline)
    confirmed_by: Mapped[str | None] = mapped_column(String(36))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
# Notification Templates & Logs
# ─────────────────────────────────────────────────────────────────────────────


class NotificationTemplate(Base):
    """Template pesan notifikasi yang bisa di-custom oleh admin.

    event_key adalah identifier unik per jenis notifikasi.

    ── EVENT KEYS AKTIF (sesuai spec notifikasi terbaru) ──────────────────────
    Fase 1 – Pendaftaran Awal & Formulir:
      registration_account_created  → Pendaftaran akun berhasil
      payment_success_formulir      → Pembayaran formulir berhasil
      wave_closed_pending_payment   → Gelombang ditutup, tagihan dibatalkan
      payment_reminder_monday       → Pengingat bayar formulir setiap Senin

    Fase 2 – Verifikasi Dokumen & TIU:
      document_rejected_revision    → Dokumen ditolak (perlu revisi)
      document_approved_non_tiu     → Dokumen disetujui (bukan jalur TIU)
      tiu_exam_instructions         → Dokumen disetujui (jalur TIU) — instruksi SEB
      tiu_result_ready              → Hasil TIU tersedia via webhook Apps Script

    Fase 3 – Ujian & Wawancara:
      session_confirmed             → Jadwal ujian Tahfidz/Wawancara terkonfirmasi
      tahfidz_score_recorded        → Nilai Tahfidz direkam, lanjut ke wawancara
      interview_completed           → Wawancara selesai, menunggu pengumuman

    Fase 4 – Kelulusan & Pembayaran DP:
      selection_result_passed       → Lulus + instruksi bayar DP
      selection_result_failed       → Tidak lulus
      dp_payment_reminder           → Pengingat bayar DP mingguan (3 bulan)
      dp_payment_success            → DP berhasil + SKD + link grup WA

    Fase 5 – Pengingat Lanjutan:
      reminder_upload_docs_h3       → Pengingat upload dokumen H+3
      reminder_take_session_h2      → Pengingat pilih jadwal ujian H+2
      reminder_exam_1hour           → Pengingat ujian 1 jam sebelum
      reminder_installment          → Pengingat cicilan bulanan

    ── EVENT KEYS LEGACY (tetap ada untuk backward-compat) ───────────────────
      registration_welcome, payment_failed, payment_reminder_day7,
      payment_expired, payment_success, document_reminder_3days,
      document_reminder_1day, document_rejected, document_approved,
      selection_announced, selection_reminder_5days, selection_reminder_1day,
      selection_passed, selection_failed, payment_manual_approved,
      reregistration_reminder, reregistration_success, wave_closing,
      user_created, password_reset

    ── CHANNEL ────────────────────────────────────────────────────────────────
    channel: whatsapp (email tidak digunakan; field tetap ada di skema DB
    untuk backward-compat tapi notif_email_enabled=False di config)

    ── VARIABEL TEMPLATE ──────────────────────────────────────────────────────
    Body mendukung placeholder {variable_name}. Variabel tersedia:
      Identitas: {nama_peserta}, {username}, {email}, {phone}, {password},
                 {nama_sekolah}
      Link: {link_login}, {link_aplikasi}, {link_pembayaran},
            {link_panduan_seb}, {link_grup_whatsapp}
      Gelombang: {nama_gelombang}, {tanggal_tutup}, {tanggal_tutup_gelombang},
                 {batas_waktu_bayar}
      Pembayaran: {nominal_bayar}, {alasan_gagal}
      Dokumen: {alasan_penolakan}
      TIU: {nilai_tiu}
      Ujian: {nama_ujian}, {tanggal}, {jam_mulai}, {jam_selesai}, {waktu},
             {lokasi_atau_link}
      Kelulusan: {deadline_daftar_ulang}
      DP: {sisa_waktu}, {tanggal_jatuh_tempo}
      Cicilan: {bulan_cicilan}, {nominal_cicilan}
    """

    __tablename__ = "notification_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # Identifier unik event (lihat docstring)
    event_key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    # Label human-readable untuk tampilan admin
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    # Saluran pengiriman: email | whatsapp | both
    channel: Mapped[str] = mapped_column(String(20), default="both")
    # Subject email (khusus channel email/both)
    email_subject: Mapped[str | None] = mapped_column(String(255))
    # Body pesan (mendukung variabel {placeholder})
    body: Mapped[str] = mapped_column(Text, nullable=False)
    # True = template ini diaktifkan / akan dikirim sistem
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class NotificationLog(Base):
    """Log setiap percobaan pengiriman notifikasi.

    status: pending | sent | failed
    """

    __tablename__ = "notification_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # Relasi ke template yang dipakai (nullable: bisa dikirim manual tanpa template)
    template_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("notification_templates.id", ondelete="SET NULL")
    )
    # event_key snapshot (tidak berubah meski template diedit)
    event_key: Mapped[str] = mapped_column(String(50), nullable=False)
    # Penerima — bisa applicant atau user lain
    recipient_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    recipient_name: Mapped[str | None] = mapped_column(String(255))
    recipient_email: Mapped[str | None] = mapped_column(String(100))
    recipient_phone: Mapped[str | None] = mapped_column(String(20))
    # Saluran yang dipakai: email | whatsapp
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    # Snapshot subject & body yang benar-benar terkirim (setelah substitusi variabel)
    subject_sent: Mapped[str | None] = mapped_column(String(255))
    body_sent: Mapped[str | None] = mapped_column(Text)
    # Status pengiriman: pending | sent | failed
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # Pesan error jika gagal
    error_message: Mapped[str | None] = mapped_column(Text)
    # Timestamp kirim / gagal
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBWaveFeeItem(Base):
    """Item biaya Tahap 2 per gelombang (custom list: Uang Pangkal, Uang Gedung,
    dll)."""

    __tablename__ = "ppdb_wave_fee_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    wave_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("ppdb_waves.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    nominal: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    discount_type: Mapped[str | None] = mapped_column(String(10))
    discount_value: Mapped[float | None] = mapped_column(Float)
    discount_scope: Mapped[str] = mapped_column(
        String(10), default="all", nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBApplicantDiscount(Base):
    """Konfigurasi diskon + cicilan per peserta per item biaya Tahap 2.

    discount_type: 'percent' | 'nominal' | None (tidak ada diskon)
    discount_value: nilai diskon (angka %, atau Rp)
    discount_amount: nominal diskon hasil hitung (Rp)
    final_amount: nominal - discount_amount (yang harus dibayar)
    installment_count: 0 = lump sum, N = dicicil N kali
    """

    __tablename__ = "ppdb_applicant_discounts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ppdb_applicants.id", ondelete="CASCADE")
    )
    fee_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ppdb_wave_fee_items.id", ondelete="CASCADE")
    )
    discount_type: Mapped[str | None] = mapped_column(
        String(10)
    )  # 'percent' | 'nominal'
    discount_value: Mapped[float | None] = mapped_column()  # angka diskon
    discount_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    final_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    installment_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBStage2Bill(Base):
    """Tagihan pembayaran Tahap 2 per peserta per item (atau per cicilan).

    installment_number: 0 = lump sum, 1..N = cicilan ke-N
    status: pending | paid | cancelled
    """

    __tablename__ = "ppdb_stage2_bills"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ppdb_applicants.id", ondelete="CASCADE")
    )
    fee_item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ppdb_wave_fee_items.id")
    )
    discount_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("ppdb_applicant_discounts.id", ondelete="SET NULL")
    )
    installment_number: Mapped[int] = mapped_column(Integer, default=0)
    amount: Mapped[int] = mapped_column(BigInteger, default=0)
    due_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    proof_url: Mapped[str | None] = mapped_column(Text)
    confirmed_by: Mapped[str | None] = mapped_column(String(36))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBBMOU(Base):
    """MOU per peserta yang lulus seleksi.

    status: draft | signed
    draft_content: HTML/markdown template MOU (diisi dari wave.mou_template +
    data peserta)
    signature_data: base64 image tanda tangan canvas
    """

    __tablename__ = "ppdb_mou"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ppdb_applicants.id", ondelete="CASCADE"), unique=True
    )
    draft_content: Mapped[str | None] = mapped_column(Text)
    signature_data: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    signed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBTIUAttempt(Base):
    __tablename__ = "ppdb_tiu_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ppdb_applicants.id", ondelete="CASCADE")
    )
    token: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
