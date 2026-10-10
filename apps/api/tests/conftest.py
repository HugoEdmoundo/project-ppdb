"""Test bootstrap.

Runs the API test-suite against a throwaway SQLite database unless the
caller already provided `DATABASE_URL`. The database is migrated to `head`
and seeded (modules, pages, roles, superadmin, templates) so endpoint tests
work against a fully populated schema.

Run from `apps/api/`:

    python -m pytest tests/ -v
"""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

API_DIR = Path(__file__).resolve().parent.parent

_TMP_ROOT = Path(tempfile.gettempdir()) / "ptdarrahman_api_tests"
_TMP_ROOT.mkdir(exist_ok=True)
_TMP_DB = _TMP_ROOT / f"test_{os.getpid()}.db"


def _run(cmd: list[str]) -> None:
    result = subprocess.run(
        cmd,
        cwd=str(API_DIR),
        env=os.environ,
        check=False,
        capture_output=True,
    )
    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", "replace")
        stdout = result.stdout.decode("utf-8", "replace")
        raise RuntimeError(
            f"Bootstrapping test DB failed: {' '.join(cmd)} "
            f"(exit {result.returncode}).\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}"
        )


def _bootstrap_env() -> None:
    if "DATABASE_URL" in os.environ:
        return
    db_url = f"sqlite:///{_TMP_DB.as_posix()}"
    os.environ["DATABASE_URL"] = db_url
    if _TMP_DB.exists():
        _TMP_DB.unlink()
    _run([sys.executable, "-m", "alembic", "upgrade", "head"])
    _run([sys.executable, "-m", "scripts.seed"])


_bootstrap_env()
