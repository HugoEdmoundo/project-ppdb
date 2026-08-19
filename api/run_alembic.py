import sys; from alembic.config import main; main(argv=['revision', '--autogenerate', '-m', 'add address fields']); main(argv=['upgrade', 'head'])
