"""Add created_by to selection_sessions and seed officer_session_booked template

Revision ID: 0039
Revises: 0038
Create Date: 2026-10-09 10:45:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0039"
down_revision: str | None = "0038"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("selection_sessions")}
    if "created_by" not in cols:
        with op.batch_alter_table("selection_sessions") as batch_op:
            batch_op.add_column(
                sa.Column("created_by", sa.String(length=36), nullable=True)
            )

    # Seed officer_session_booked notification template if not exists
    existing_tmpl = bind.execute(
        sa.text(
            "SELECT id FROM notification_templates "
            "WHERE event_key = 'officer_session_booked'"
        )
    ).scalar()

    if not existing_tmpl:
        body_text = (
            "📅 *Jadwal Sesi 1:1 Telah Diambil Pendaftar*\n\n"
            "Halo *{nama_petugas}*,\n"
            "Sesi *{nama_sesi}* (*{jenis_sesi}*) yang Anda jadwalkan telah "
            "berhasil diambil oleh calon santri:\n\n"
            "👤 Nama Pendaftar: *{nama_pendaftar}*\n"
            "📆 Tanggal: *{tanggal}*\n"
            "⏰ Waktu: *{jam_mulai} - {jam_selesai} WIB*\n"
            "📍 Lokasi/Link: *{lokasi_atau_link}*\n\n"
            "Mohon untuk mempersiapkan diri dan hadir tepat waktu agar proses "
            "evaluasi berjalan lancar. Jangan sampai terlambat ya!\n\n"
            "Terima kasih,\n"
            "Panitia PPDB Ar-Rahman"
        )
        bind.execute(
            sa.text(
                "INSERT INTO notification_templates "
                "(id, event_key, label, channel, email_subject, body, is_active, "
                "created_at, updated_at) "
                "VALUES (:id, :event_key, :label, :channel, :email_subject, "
                ":body, :is_active, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {
                "id": "notiftmpl-1020-officer-session-booked",
                "event_key": "officer_session_booked",
                "label": "Pemberitahuan Sesi Diambil Calon Santri (Evaluator/Admin)",
                "channel": "whatsapp",
                "email_subject": None,
                "body": body_text,
                "is_active": True,
            },
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("selection_sessions")}
    if "created_by" in cols:
        with op.batch_alter_table("selection_sessions") as batch_op:
            batch_op.drop_column("created_by")

    bind.execute(
        sa.text(
            "DELETE FROM notification_templates "
            "WHERE event_key = 'officer_session_booked'"
        )
    )
