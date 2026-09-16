# mypy: ignore-errors
"""Normalize applicant user_type and applicant role name

Revision ID: 0017
Revises: 0016
Create Date: 2026-09-10 12:00:00.000000

Historically applicants were created with mixed `user_type` values
(`calon_murid` in `/auth/register-applicant`, `applicant` elsewhere) and the
applicant system role was referenced both as "Calon Murid" and "Pendaftar".

This migration standardizes on the conventions used everywhere else:
- `users.user_type` = `applicant`
- role name = `Pendaftar` (marked `is_system = 1`)

Legacy `Calon Murid` rows are re-pointed/consolidated when `Pendaftar`
already exists, or renamed in place when it does not.
"""

from collections.abc import Sequence

import sqlalchemy as sa

import alembic.op as op

# revision identifiers, used by Alembic.
revision: str = "0017"
down_revision: str | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ROLE_NAME = "Pendaftar"
_LEGACY_ROLE_NAME = "Calon Murid"


def upgrade() -> None:
    bind = op.get_bind()

    # Normalize legacy applicant user_type
    bind.execute(
        sa.text(
            "UPDATE users SET user_type = 'applicant' "
            "WHERE user_type = 'calon_murid'"
        )
    )

    # Ensure the default applicant role exists and is a system role
    pendaftar = bind.execute(
        sa.text("SELECT id FROM roles WHERE name = :name LIMIT 1"),
        {"name": _ROLE_NAME},
    ).first()
    legacy = bind.execute(
        sa.text("SELECT id FROM roles WHERE name = :name LIMIT 1"),
        {"name": _LEGACY_ROLE_NAME},
    ).first()

    if pendaftar is None and legacy is not None:
        # No prob roles exist yet (e.g. 0004 applied but seed not run).
        bind.execute(
            sa.text("UPDATE roles SET name = :new_name, is_system = 1 WHERE id = :id"),
            {"new_name": _ROLE_NAME, "id": legacy.id},
        )
        return

    if pendaftar is not None:
        bind.execute(
            sa.text("UPDATE roles SET is_system = 1 WHERE id = :id"),
            {"id": pendaftar.id},
        )
        if legacy is not None:
            # Re-point any users still on the legacy role, then drop it.
            bind.execute(
                sa.text(
                    "UPDATE users SET role_id = :new_id "
                    "WHERE role_id IN (SELECT id FROM roles WHERE name = :old_name)"
                ),
                {"new_id": pendaftar.id, "old_name": _LEGACY_ROLE_NAME},
            )
            bind.execute(
                sa.text("DELETE FROM roles WHERE name = :name"),
                {"name": _LEGACY_ROLE_NAME},
            )


def downgrade() -> None:
    # Intentionally non-reversible: we cannot tell which users were converted.
    pass
