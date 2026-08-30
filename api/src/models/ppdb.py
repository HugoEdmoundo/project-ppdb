from datetime import date, datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, String, Text

from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class PPDBPeriod(Base):
    __tablename__ = "ppdb_periods"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    academic_year: Mapped[Optional[str]] = mapped_column(String(20))
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="inactive")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBWave(Base):
    __tablename__ = "ppdb_waves"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    period_id: Mapped[str] = mapped_column(String(50), ForeignKey("ppdb_periods.id", ondelete="CASCADE"))
    wave_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # Scope gelombang: nilai dipisah koma, contoh "reguler,pindahan" / "SMP,SMK"
    allowed_paths: Mapped[str] = mapped_column(String(50), default="reguler,pindahan")
    allowed_levels: Mapped[str] = mapped_column(String(100), default="SMP,SMK")
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    registration_start_date: Mapped[Optional[date]] = mapped_column(Date)
    registration_end_date: Mapped[Optional[date]] = mapped_column(Date)
    document_upload_end_date: Mapped[Optional[date]] = mapped_column(Date)
    selection_date: Mapped[Optional[date]] = mapped_column(Date)
    quota: Mapped[int] = mapped_column(Integer, default=0)
    registration_fee: Mapped[int] = mapped_column(BigInteger, default=0)
    second_stage_fee: Mapped[int] = mapped_column(BigInteger, default=0)
    mou_template: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="inactive")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBApplicant(Base):
    __tablename__ = "ppdb_applicants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    wave_id: Mapped[str] = mapped_column(String(36), ForeignKey("ppdb_waves.id"))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    registration_path: Mapped[str] = mapped_column(String(50), nullable=False)
    registration_level: Mapped[str] = mapped_column(String(50), nullable=False)
    birth_place: Mapped[Optional[str]] = mapped_column(String(100))
    birth_date: Mapped[Optional[date]] = mapped_column(Date)
    gender: Mapped[Optional[str]] = mapped_column(String(10))
    nisn: Mapped[Optional[str]] = mapped_column(String(50))
    nik: Mapped[Optional[str]] = mapped_column(String(50))
    parent_name: Mapped[Optional[str]] = mapped_column(String(255))
    previous_school: Mapped[Optional[str]] = mapped_column(String(255))
    major_choice: Mapped[Optional[str]] = mapped_column(String(100))
    province: Mapped[Optional[str]] = mapped_column(String(100))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    district: Mapped[Optional[str]] = mapped_column(String(100))
    village: Mapped[Optional[str]] = mapped_column(String(100))
    postal_code: Mapped[Optional[str]] = mapped_column(String(20))
    address: Mapped[Optional[str]] = mapped_column(Text)
    # status alur pendaftaran: pending_payment | paid | document_uploaded |
    #   document_approved | document_rejected | selection | passed | failed | expired
    status: Mapped[str] = mapped_column(String(50), default="pending_payment")
    # ── Payment tracking ──────────────────────────────────────────────────────
    # payment_status: pending | paid | failed | expired
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    # Batas waktu bayar = created_at + 7 hari (diisi saat register)
    payment_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime)
    # ── Soft Delete (Hari ke-8 belum bayar → cron job set deleted_at) ────────
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=None)
    # Alasan penolakan dokumen (diisi admin saat verifikasi; NULL saat belum/sudah disetujui)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class FileUpload(Base):
    __tablename__ = "file_uploads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    public_url: Mapped[Optional[str]] = mapped_column(String(500))
    entity_type: Mapped[Optional[str]] = mapped_column(String(50))
    entity_id: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    nisn: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    nis: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    gender: Mapped[str] = mapped_column(String(10), default="L")
    birth_place: Mapped[str] = mapped_column(String(255), default="")
    birth_date: Mapped[Optional[date]] = mapped_column(Date)
    address: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(String(50), default="")
    email: Mapped[str] = mapped_column(String(255), default="")
    father_name: Mapped[str] = mapped_column(String(255), default="")
    mother_name: Mapped[str] = mapped_column(String(255), default="")
    father_occupation: Mapped[str] = mapped_column(String(255), default="")
    mother_occupation: Mapped[str] = mapped_column(String(255), default="")
    parent_phone: Mapped[str] = mapped_column(String(50), default="")
    photo: Mapped[str] = mapped_column(String(255), default="")
    previous_school: Mapped[str] = mapped_column(String(255), default="")
    registration_number: Mapped[str] = mapped_column(String(100), default="")
    registration_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    program: Mapped[str] = mapped_column(String(255), default="")
    class_name: Mapped[str] = mapped_column(String(255), default="")
    academic_year: Mapped[str] = mapped_column(String(20), default="")
    status: Mapped[str] = mapped_column(String(20), default="active")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SPPBill(Base):
    __tablename__ = "spp_bills"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"))
    bill_month: Mapped[int] = mapped_column(Integer, nullable=False)
    bill_year: Mapped[int] = mapped_column(Integer, nullable=False)
    nominal: Mapped[int] = mapped_column(BigInteger, default=0)
    total_paid: Mapped[int] = mapped_column(BigInteger, default=0)
    status: Mapped[str] = mapped_column(String(20), default="unpaid")
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SPPPayment(Base):
    __tablename__ = "spp_payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"))
    bill_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("spp_bills.id", ondelete="SET NULL"))
    amount: Mapped[int] = mapped_column(BigInteger, default=0)
    payment_method: Mapped[str] = mapped_column(String(50), default="cash")
    proof_type: Mapped[Optional[str]] = mapped_column(String(50))
    proof_url: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    confirmed_by: Mapped[Optional[str]] = mapped_column(String(36))
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    paid_by: Mapped[Optional[str]] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SPPSetting(Base):
    __tablename__ = "spp_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    class_name: Mapped[str] = mapped_column(String(255), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)
    nominal: Mapped[int] = mapped_column(BigInteger, default=0)
    is_active: Mapped[bool] = mapped_column("is_active", nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


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

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ppdb_applicants.id", ondelete="CASCADE")
    )
    # Metode: offline (cash ke panitia) | online (payment gateway / simulator)
    method: Mapped[str] = mapped_column(String(20), default="offline")
    amount: Mapped[int] = mapped_column(BigInteger, default=0)
    # Status transaksi: pending | success | failed | expired | cancelled
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # Referensi order/invoice dari PG (nullable untuk metode offline)
    external_id: Mapped[Optional[str]] = mapped_column(String(100))
    # Raw payload dari webhook PG (JSON string)
    gateway_payload: Mapped[Optional[str]] = mapped_column(Text)
    # Alasan gagal (untuk notif ke pendaftar)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text)
    # URL bukti transfer / kwitansi (untuk metode offline)
    proof_url: Mapped[Optional[str]] = mapped_column(Text)
    # Admin yang mengkonfirmasi (untuk metode offline)
    confirmed_by: Mapped[Optional[str]] = mapped_column(String(36))
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
# Notification Templates & Logs
# ─────────────────────────────────────────────────────────────────────────────

class NotificationTemplate(Base):
    """Template pesan notifikasi yang bisa di-custom oleh admin.

    event_key adalah identifier unik per jenis notifikasi:
      welcome              → Selamat datang + kredensial login
      payment_reminder     → Pengingat bayar formulir (langsung saat daftar)
      payment_reminder_d7  → Reminder bayar H-7 (hari ke-7 belum bayar)
      payment_success      → Pembayaran berhasil
      payment_failed       → Pembayaran gagal / ditolak PG
      payment_expired      → Akun expired (hari ke-8 belum bayar, soft delete)
      document_reminder_d3 → Reminder upload dokumen H-3 batas gelombang
      document_reminder_d1 → Reminder upload dokumen H-1 batas gelombang
      document_approved    → Dokumen disetujui admin
      document_rejected    → Dokumen ditolak admin (+ alasan)
      selection_reminder_d5 → Reminder seleksi H-5
      selection_reminder_d1 → Reminder seleksi H-1
      selection_result     → Pengumuman hasil seleksi

    channel: email | whatsapp | both

    Body template mendukung variabel sistem:
      {nama_peserta}, {username}, {password}, {link_login},
      {batas_waktu_bayar}, {nama_gelombang}, {tanggal_seleksi},
      {alasan_penolakan}, {link_pembayaran}, {nominal_bayar}
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
    email_subject: Mapped[Optional[str]] = mapped_column(String(255))
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
    template_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("notification_templates.id", ondelete="SET NULL")
    )
    # event_key snapshot (tidak berubah meski template diedit)
    event_key: Mapped[str] = mapped_column(String(50), nullable=False)
    # Penerima — bisa applicant atau user lain
    recipient_user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    recipient_name: Mapped[Optional[str]] = mapped_column(String(255))
    recipient_email: Mapped[Optional[str]] = mapped_column(String(100))
    recipient_phone: Mapped[Optional[str]] = mapped_column(String(20))
    # Saluran yang dipakai: email | whatsapp
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    # Snapshot subject & body yang benar-benar terkirim (setelah substitusi variabel)
    subject_sent: Mapped[Optional[str]] = mapped_column(String(255))
    body_sent: Mapped[Optional[str]] = mapped_column(Text)
    # Status pengiriman: pending | sent | failed
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # Pesan error jika gagal
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    # Timestamp kirim / gagal
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBWaveFeeItem(Base):
    """Item biaya Tahap 2 per gelombang (custom list: Uang Pangkal, Uang Gedung, dll)."""
    __tablename__ = "ppdb_wave_fee_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    wave_id: Mapped[str] = mapped_column(String(36), ForeignKey("ppdb_waves.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    nominal: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
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
    applicant_id: Mapped[str] = mapped_column(String(36), ForeignKey("ppdb_applicants.id", ondelete="CASCADE"))
    fee_item_id: Mapped[str] = mapped_column(String(36), ForeignKey("ppdb_wave_fee_items.id", ondelete="CASCADE"))
    discount_type: Mapped[Optional[str]] = mapped_column(String(10))  # 'percent' | 'nominal'
    discount_value: Mapped[Optional[float]] = mapped_column()  # angka diskon
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
    applicant_id: Mapped[str] = mapped_column(String(36), ForeignKey("ppdb_applicants.id", ondelete="CASCADE"))
    fee_item_id: Mapped[str] = mapped_column(String(36), ForeignKey("ppdb_wave_fee_items.id"))
    discount_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("ppdb_applicant_discounts.id", ondelete="SET NULL"))
    installment_number: Mapped[int] = mapped_column(Integer, default=0)
    amount: Mapped[int] = mapped_column(BigInteger, default=0)
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    proof_url: Mapped[Optional[str]] = mapped_column(Text)
    confirmed_by: Mapped[Optional[str]] = mapped_column(String(36))
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PPDBBMOU(Base):
    """MOU per peserta yang lulus seleksi.
    
    status: draft | signed
    draft_content: HTML/markdown template MOU (diisi dari wave.mou_template + data peserta)
    signature_data: base64 image tanda tangan canvas
    """
    __tablename__ = "ppdb_mou"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    applicant_id: Mapped[str] = mapped_column(String(36), ForeignKey("ppdb_applicants.id", ondelete="CASCADE"), unique=True)
    draft_content: Mapped[Optional[str]] = mapped_column(Text)
    signature_data: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

