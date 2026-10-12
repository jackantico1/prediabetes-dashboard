#!/usr/bin/env bash
# Runs the Garmin sync service locally on :8000 (Next.js proxies /api/py/* to it in dev).
#
#   npm run dev:garmin            # real Garmin Connect
#   GARMIN_FAKE=1 npm run dev:garmin   # fake data, no Garmin account needed
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -x .venv/bin/python ]; then
  echo "Creating Python virtualenv in .venv …"
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet --prefer-binary -r requirements.txt uvicorn

if [ -f .env.local ]; then
  set -a; . ./.env.local; set +a
fi
export GARMIN_SERVICE_SECRET="${GARMIN_SERVICE_SECRET:-dev-secret}"
echo "Garmin service on http://127.0.0.1:8000  (fake mode: ${GARMIN_FAKE:-0})"
exec .venv/bin/uvicorn garmin_service.app:app --host 127.0.0.1 --port 8000 --reload
