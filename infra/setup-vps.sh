#!/bin/bash
# Abroadly VPS first-time setup — AlmaLinux 9 / RHEL-compatible.
# Run as root from the repo root:
#   cd /var/www/vhosts/abroadly.online/httpdocs/abroadly
#   bash infra/setup-vps.sh
#
# Idempotent: safe to re-run.

set -euo pipefail

REPO="/var/www/vhosts/abroadly.online/httpdocs/abroadly"
SYSTEMD_DIR="/etc/systemd/system"
PYTHON_BIN="/usr/bin/python3.11"

if [ "$(pwd)" != "$REPO" ]; then
  echo "ERROR: run from $REPO (current: $(pwd))"
  exit 1
fi

# ── 1. System packages ──────────────────────────────────────────────────────
echo "==> [1/6] Installing system packages..."
dnf install -y python3.11 python3.11-pip nodejs npm postgresql-server git curl

# ── 2. Postgres init ────────────────────────────────────────────────────────
echo "==> [2/6] Initializing Postgres (if needed)..."
if [ ! -d /var/lib/pgsql/data/base ]; then
  postgresql-setup --initdb
  systemctl enable --now postgresql
fi

# ── 3. Postgres user + db ───────────────────────────────────────────────────
echo "==> [3/6] Creating Postgres user + db..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='abroadly'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER abroadly WITH PASSWORD 'abroadly2026';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='abroadly'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE abroadly OWNER abroadly;"

# ── 4. Backend ──────────────────────────────────────────────────────────────
echo "==> [4/6] Backend: venv + deps..."
cd "$REPO/backend"
if [ ! -f .env ]; then
  echo "ERROR: backend/.env is missing. Place your secrets file before running setup."
  exit 1
fi
[ -d venv ] || "$PYTHON_BIN" -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

# ── 5. Frontend ─────────────────────────────────────────────────────────────
echo "==> [5/6] Frontend: deps + build..."
cd "$REPO/frontend"
if [ ! -f .env.local ]; then
  echo 'NEXT_PUBLIC_API_URL=http://abroadly.online:8000' > .env.local
  echo "    Wrote default frontend/.env.local — edit if your backend URL differs."
fi
npm install --legacy-peer-deps --no-audit --no-fund
npm run build

# ── 6. systemd units ────────────────────────────────────────────────────────
echo "==> [6/6] Installing systemd units..."
cp "$REPO/infra/systemd/abroadly-api.service" "$SYSTEMD_DIR/"
cp "$REPO/infra/systemd/abroadly-web.service" "$SYSTEMD_DIR/"
systemctl daemon-reload
systemctl enable --now abroadly-api abroadly-web

echo ""
echo "==> Setup complete. Verify:"
echo "    systemctl status abroadly-api abroadly-web"
echo "    curl http://127.0.0.1:8000/health"
echo "    curl -I http://127.0.0.1:3000"
echo ""
echo "==> Next: paste infra/nginx/abroadly.conf into Plesk's nginx directives."
