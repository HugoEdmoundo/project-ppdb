"""Penentuan scope PERIODE AKTIF untuk halaman operasional admin PPDB.

Aturan bisnis (lihat AGENTS.md):

- Seluruh halaman operasional admin PPDB (Data Pendaftar, Verifikasi Dokumen,
  Pembayaran Formulir, Pembayaran Tahap 2, Session 1:1, Hasil Pendaftaran,
  Review LoA) hanya menampilkan data dari **periode yang sedang aktif** — yaitu
  semua gelombang yang berada di dalam periode tersebut, berapa pun gelombangnya.
- Bila tidak ada periode aktif, halaman otomatis kosong.
- Filter lintas periode & gelombang hanya tersedia di halaman Arsip.

Helper di sini dipakai bersama oleh repository/service PPDB, Payment, dan
Selection agar definisi "periode aktif" konsisten di satu tempat.
"""

from typing import cast

from sqlalchemy.orm import Session

from src.models.ppdb import PPDBPeriod, PPDBWave


def get_active_period(db: Session) -> PPDBPeriod | None:
    """Periode yang sedang aktif (maksimum satu secara global)."""
    period = db.query(PPDBPeriod).filter(PPDBPeriod.status == "active").first()
    return cast(PPDBPeriod | None, period)


def get_active_period_info(db: Session) -> dict[str, str] | None:
    """Ringkasan periode aktif untuk respons API / label frontend."""
    period = get_active_period(db)
    if not period:
        return None
    return {"id": period.id, "name": period.name}


def get_wave_ids_in_period(db: Session, period_id: str) -> list[str]:
    """Seluruh id gelombang yang berada dalam satu periode (aktif maupun tidak)."""
    rows = db.query(PPDBWave.id).filter(PPDBWave.period_id == period_id).all()
    return [row[0] for row in rows]
