#!/bin/sh
set -e
echo "[start] Running migrations..."
if ! alembic upgrade head 2>&1; then
  echo "[start] MIGRATION FAILED - see above"
  sleep 30
  exit 1
fi
echo "[start] Migrations done. Starting uvicorn on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
