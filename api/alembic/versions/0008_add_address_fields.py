"""add address fields

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-18 10:23:24.851603

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql
from sqlalchemy import text

revision: str = '0008'
down_revision: Union[str, None] = '0007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _execute_safe(sql: str) -> None:
    """Execute raw SQL, ignoring common 'already done' errors."""
    try:
        op.execute(text(sql))
    except Exception as e:
        err = str(e)
        # Ignore errors that mean the operation was already done
        if any(x in err for x in [
            "Duplicate key name",
            "Can't drop",
            "check that it exists",
            "Duplicate entry",
            "already exists",
            "doesn't exist",
            "Unknown column",
            "Duplicate column",
            "error in your SQL syntax",
            "foreign key constraint",
            "Duplicate key on write",
            "Can't create table",
        ]):
            return
        raise


def upgrade() -> None:
    # ── audit_log ─────────────────────────────────────────────────────────
    _execute_safe("ALTER TABLE audit_log MODIFY COLUMN created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)")
    _execute_safe("DROP INDEX IF EXISTS idx_audit_log_created ON audit_log")
    _execute_safe("DROP INDEX IF EXISTS idx_audit_log_entity ON audit_log")
    _execute_safe("ALTER TABLE audit_log DROP FOREIGN KEY fk_audit_log_user")
    _execute_safe("DROP INDEX IF EXISTS idx_audit_log_user ON audit_log")
    _execute_safe("DROP INDEX IF EXISTS ix_audit_log_created_at ON audit_log")
    _execute_safe("DROP INDEX IF EXISTS ix_audit_log_user_id ON audit_log")
    _execute_safe("CREATE INDEX ix_audit_log_created_at ON audit_log (created_at)")
    _execute_safe("CREATE INDEX ix_audit_log_user_id ON audit_log (user_id)")
    _execute_safe("ALTER TABLE audit_log ADD CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL")

    # ── file_uploads ──────────────────────────────────────────────────────
    _execute_safe("ALTER TABLE file_uploads MODIFY COLUMN entity_type VARCHAR(50)")
    _execute_safe("DROP INDEX IF EXISTS idx_file_uploads_entity ON file_uploads")
    _execute_safe("ALTER TABLE file_uploads DROP FOREIGN KEY fk_file_uploads_user")
    _execute_safe("DROP INDEX IF EXISTS idx_file_uploads_uploaded_by ON file_uploads")
    _execute_safe("ALTER TABLE file_uploads ADD CONSTRAINT fk_file_uploads_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE")

    # ── modules ───────────────────────────────────────────────────────────
    _execute_safe("DROP INDEX uk_modules_key ON modules")
    _execute_safe("ALTER TABLE modules ADD CONSTRAINT uq_modules_key UNIQUE (`key`)")

    # ── news_articles ─────────────────────────────────────────────────────
    _execute_safe("DROP INDEX IF EXISTS idx_news_articles_slug ON news_articles")
    _execute_safe("CREATE INDEX ix_news_articles_slug ON news_articles (slug)")

    # ── notification_logs ─────────────────────────────────────────────────
    _execute_safe("ALTER TABLE notification_logs MODIFY COLUMN id VARCHAR(36) NOT NULL")
    _execute_safe("ALTER TABLE notification_logs DROP COLUMN updated_at")

    # ── pages ─────────────────────────────────────────────────────────────
    _execute_safe("ALTER TABLE pages MODIFY COLUMN icon VARCHAR(50) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE pages MODIFY COLUMN sort_order INT NOT NULL DEFAULT 0")
    _execute_safe("ALTER TABLE pages DROP FOREIGN KEY fk_pages_module")
    _execute_safe("DROP INDEX IF EXISTS uk_pages_module_key ON pages")

    # ── ppdb_applicants (new address columns + type changes) ──────────────
    _execute_safe("ALTER TABLE ppdb_payment_transactions DROP FOREIGN KEY fk_ppdb_payment_transactions_applicant_id_ppdb_applicants")
    _execute_safe("ALTER TABLE ppdb_applicants DROP FOREIGN KEY fk_ppdb_applicants_wave")
    _execute_safe("ALTER TABLE ppdb_applicants ADD COLUMN province VARCHAR(100)")
    _execute_safe("ALTER TABLE ppdb_applicants ADD COLUMN city VARCHAR(100)")
    _execute_safe("ALTER TABLE ppdb_applicants ADD COLUMN district VARCHAR(100)")
    _execute_safe("ALTER TABLE ppdb_applicants ADD COLUMN village VARCHAR(100)")
    _execute_safe("ALTER TABLE ppdb_applicants ADD COLUMN postal_code VARCHAR(20)")
    _execute_safe("ALTER TABLE ppdb_applicants MODIFY COLUMN id VARCHAR(36) NOT NULL")
    _execute_safe("ALTER TABLE ppdb_applicants MODIFY COLUMN wave_id VARCHAR(36) NOT NULL")
    _execute_safe("ALTER TABLE ppdb_applicants MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending_payment'")

    # ── ppdb_payment_transactions ─────────────────────────────────────────
    _execute_safe("ALTER TABLE ppdb_payment_transactions MODIFY COLUMN id VARCHAR(36) NOT NULL")
    _execute_safe("ALTER TABLE ppdb_payment_transactions MODIFY COLUMN applicant_id VARCHAR(36) NOT NULL")
    _execute_safe("ALTER TABLE ppdb_payment_transactions ADD CONSTRAINT fk_ppdb_payment_transactions_applicant_id_ppdb_applicants FOREIGN KEY (applicant_id) REFERENCES ppdb_applicants(id) ON DELETE CASCADE")

    # ── ppdb_periods ──────────────────────────────────────────────────────
    _execute_safe("ALTER TABLE ppdb_periods MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'inactive'")

    # ── ppdb_waves ────────────────────────────────────────────────────────
    _execute_safe("ALTER TABLE ppdb_waves MODIFY COLUMN quota INT NOT NULL DEFAULT 0")
    _execute_safe("ALTER TABLE ppdb_waves MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'inactive'")
    _execute_safe("DROP INDEX IF EXISTS period_id ON ppdb_waves")
    _execute_safe("ALTER TABLE ppdb_waves ADD CONSTRAINT fk_ppdb_waves_period_id_ppdb_periods FOREIGN KEY (period_id) REFERENCES ppdb_periods(id) ON DELETE CASCADE")

    # ── programs ──────────────────────────────────────────────────────────
    _execute_safe("DROP INDEX IF EXISTS idx_programs_slug ON programs")
    _execute_safe("CREATE INDEX ix_programs_slug ON programs (slug)")

    # ── rate_limits ───────────────────────────────────────────────────────
    _execute_safe("DROP INDEX IF EXISTS idx_key ON rate_limits")

    # ── refresh_tokens ────────────────────────────────────────────────────
    _execute_safe("ALTER TABLE refresh_tokens MODIFY COLUMN revoked TINYINT(1) NOT NULL DEFAULT 0")
    _execute_safe("ALTER TABLE refresh_tokens MODIFY COLUMN created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)")
    _execute_safe("DROP INDEX IF EXISTS idx_refresh_tokens_hash ON refresh_tokens")
    _execute_safe("ALTER TABLE refresh_tokens DROP FOREIGN KEY fk_refresh_tokens_user")
    _execute_safe("DROP INDEX IF EXISTS idx_refresh_tokens_user ON refresh_tokens")
    _execute_safe("DROP INDEX IF EXISTS ix_refresh_tokens_user_id ON refresh_tokens")
    _execute_safe("CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id)")

    # ── roles ─────────────────────────────────────────────────────────────
    _execute_safe("ALTER TABLE roles MODIFY COLUMN is_superadmin TINYINT(1) NOT NULL DEFAULT 0")
    _execute_safe("DROP INDEX uk_roles_name ON roles")
    _execute_safe("ALTER TABLE roles ADD CONSTRAINT uq_roles_name UNIQUE (name)")

    # ── spp_bills ─────────────────────────────────────────────────────────
    _execute_safe("ALTER TABLE spp_bills MODIFY COLUMN total_paid BIGINT NOT NULL DEFAULT 0")
    _execute_safe("ALTER TABLE spp_bills MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'unpaid'")
    _execute_safe("DROP INDEX IF EXISTS idx_spp_bills_month_year ON spp_bills")
    _execute_safe("DROP INDEX IF EXISTS idx_spp_bills_status ON spp_bills")
    _execute_safe("ALTER TABLE spp_bills DROP FOREIGN KEY fk_spp_bills_student")
    _execute_safe("DROP INDEX IF EXISTS idx_spp_bills_student ON spp_bills")

    # ── spp_payments ──────────────────────────────────────────────────────
    _execute_safe("ALTER TABLE spp_payments MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'")
    _execute_safe("ALTER TABLE spp_payments DROP FOREIGN KEY fk_spp_payments_bill")
    _execute_safe("DROP INDEX IF EXISTS idx_spp_payments_bill ON spp_payments")
    _execute_safe("DROP INDEX IF EXISTS idx_spp_payments_status ON spp_payments")
    _execute_safe("ALTER TABLE spp_payments DROP FOREIGN KEY fk_spp_payments_student")
    _execute_safe("DROP INDEX IF EXISTS idx_spp_payments_student ON spp_payments")

    # ── spp_settings ──────────────────────────────────────────────────────
    _execute_safe("DROP INDEX IF EXISTS idx_spp_settings_class_year ON spp_settings")

    # ── students ──────────────────────────────────────────────────────────
    _execute_safe("ALTER TABLE students MODIFY COLUMN gender VARCHAR(10) NOT NULL DEFAULT 'L'")
    _execute_safe("ALTER TABLE students MODIFY COLUMN birth_place VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN phone VARCHAR(50) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN email VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN father_name VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN mother_name VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN father_occupation VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN mother_occupation VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN parent_phone VARCHAR(50) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN photo VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN previous_school VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN registration_number VARCHAR(100) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN program VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN class_name VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN academic_year VARCHAR(20) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE students MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'")
    _execute_safe("DROP INDEX IF EXISTS idx_students_academic_year ON students")
    _execute_safe("DROP INDEX IF EXISTS idx_students_class ON students")
    _execute_safe("DROP INDEX IF EXISTS idx_students_program ON students")
    _execute_safe("DROP INDEX IF EXISTS idx_students_status ON students")
    _execute_safe("DROP INDEX uk_students_nis ON students")
    _execute_safe("DROP INDEX uk_students_nisn ON students")
    _execute_safe("ALTER TABLE students ADD CONSTRAINT uq_students_nis UNIQUE (nis)")
    _execute_safe("ALTER TABLE students ADD CONSTRAINT uq_students_nisn UNIQUE (nisn)")

    # ── user_page_permissions ─────────────────────────────────────────────
    _execute_safe("ALTER TABLE user_page_permissions DROP FOREIGN KEY fk_upp_user")
    _execute_safe("DROP INDEX IF EXISTS uk_user_page ON user_page_permissions")

    # ── users ─────────────────────────────────────────────────────────────
    _execute_safe("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE users MODIFY COLUMN user_type VARCHAR(50) NOT NULL DEFAULT 'admin'")
    _execute_safe("ALTER TABLE users MODIFY COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1")
    _execute_safe("ALTER TABLE users MODIFY COLUMN full_name VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE users MODIFY COLUMN avatar_url VARCHAR(255) NOT NULL DEFAULT ''")
    _execute_safe("ALTER TABLE users MODIFY COLUMN failed_login_attempts INT NOT NULL DEFAULT 0")
    _execute_safe("ALTER TABLE users DROP FOREIGN KEY fk_users_role")
    _execute_safe("DROP INDEX IF EXISTS idx_users_role_id ON users")
    _execute_safe("DROP INDEX uk_users_email ON users")
    _execute_safe("DROP INDEX uk_users_username ON users")
    _execute_safe("CREATE INDEX ix_users_role_id ON users (role_id)")
    _execute_safe("ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email)")
    _execute_safe("ALTER TABLE users ADD CONSTRAINT uq_users_username UNIQUE (username)")

    # ── Recreate FKs that were dropped above ──────────────────────────────
    _execute_safe("ALTER TABLE ppdb_applicants ADD CONSTRAINT fk_ppdb_applicants_wave FOREIGN KEY (wave_id) REFERENCES ppdb_waves(id)")
    _execute_safe("ALTER TABLE pages ADD CONSTRAINT fk_pages_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE")
    _execute_safe("ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE")
    _execute_safe("ALTER TABLE spp_bills ADD CONSTRAINT fk_spp_bills_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE")
    _execute_safe("ALTER TABLE spp_payments ADD CONSTRAINT fk_spp_payments_bill FOREIGN KEY (bill_id) REFERENCES spp_bills(id) ON DELETE SET NULL")
    _execute_safe("ALTER TABLE spp_payments ADD CONSTRAINT fk_spp_payments_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE")
    _execute_safe("ALTER TABLE user_page_permissions ADD CONSTRAINT fk_upp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE")
    _execute_safe("ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)")


def downgrade() -> None:
    pass
