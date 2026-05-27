#!/bin/bash
# Abroadly deploy script — pull latest main, rebuild, restart both services.
# Run on the VPS:  cd /var/www/vhosts/abroadly.online/httpdocs/abroadly && ./deploy.sh
# First-time setup:  see infra/DEPLOY.md and infra/setup-vps.sh

set -euo pipefail

REPO="/var/www/vhosts/abroadly.online/httpdocs/abroadly"
LOG_DIR="/var/log"
PYTHON_BIN="/usr/bin/python3.11"

cd "$REPO"

echo "==> Pulling latest from main..."
git pull origin main

# ── Backend ──────────────────────────────────────────────────────────────────
echo "==> Backend: install deps + restart..."
cd "$REPO/backend"

if [ ! -d venv ] || ! ./venv/bin/python --version >/dev/null 2>&1; then
  echo "    Venv missing or broken — rebuilding with $PYTHON_BIN..."
  rm -rf venv
  "$PYTHON_BIN" -m venv venv
fi

./venv/bin/pip install --quiet --upgrade pip
./venv/bin/pip install --quiet -r requirements.txt

if systemctl list-unit-files 2>/dev/null | grep -q '^abroadly-api.service'; then
  systemctl restart abroadly-api
else
  fuser -k 8000/tcp 2>/dev/null || true
  nohup ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 \
    > "$LOG_DIR/abroadly-api.log" 2>&1 &
  disown
fi

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "==> Frontend: install + build + restart..."
cd "$REPO/frontend"
npm install --legacy-peer-deps --no-audit --no-fund
npm run build

if systemctl list-unit-files 2>/dev/null | grep -q '^abroadly-web.service'; then
  systemctl restart abroadly-web
else
  fuser -k 3000/tcp 2>/dev/null || true
  nohup npm run start -- -p 3000 \
    > "$LOG_DIR/abroadly-web.log" 2>&1 &
  disown
fi

# ── Health check ─────────────────────────────────────────────────────────────
echo "==> Waiting for services..."
sleep 4
echo -n "    Backend  : "; curl -fsS http://127.0.0.1:8000/health && echo
echo -n "    Frontend : "; curl -fsSI http://127.0.0.1:3000 | head -1
echo "==> Deploy complete."
