#!/bin/sh
set -e
# Set SKIP_MIGRATIONS=1 in Railway Variables to bypass migrations (run: railway run alembic upgrade head)
if [ "$SKIP_MIGRATIONS" != "1" ]; then
  echo "[start] Running migrations..."
  alembic upgrade head 2>&1 || { echo "[start] Migration failed/skipped"; }
fi
echo "[start] Starting uvicorn on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
