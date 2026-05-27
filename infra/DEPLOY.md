# Abroadly — VPS Deploy Guide

Single-file truth for deploying Abroadly to a fresh Hostinger VPS (AlmaLinux 9, Plesk-managed).

This replaces the older `(C) DEPLOY-NOTES.md` aspirational doc — that one is kept for historical context; this one reflects the live setup.

## Architecture on the VPS

```
nginx (Plesk-managed, :80)
  ├── /api/*  →  uvicorn  127.0.0.1:8000  (systemd: abroadly-api)
  └── /*      →  next     127.0.0.1:3000  (systemd: abroadly-web)
```

- Postgres on `localhost:5432`
- ChromaDB persisted in `backend/chroma_db/`
- Everything under `/var/www/vhosts/abroadly.online/httpdocs/abroadly/`

---

## First-time setup

### 1. Put the repo in place

Either option:

**Option A — git clone** (recommended; future deploys are `git pull`):
```bash
cd /var/www/vhosts/abroadly.online/httpdocs
git clone https://github.com/stha-hardik/abroadly.git
cd abroadly
git config --global --add safe.directory $(pwd)
```

**Option B — unzip a release zip:**
```bash
cd /var/www/vhosts/abroadly.online/httpdocs
unzip /path/to/abroadly-clean.zip -d abroadly
cd abroadly
```

### 2. Place secrets

`backend/.env` is gitignored — you supply it. See `.env.example` for the keys it expects.

```bash
# example: copy from a safe backup
cp /root/abroadly-secrets/.env backend/.env
chmod 600 backend/.env
```

### 3. Set the frontend env

`frontend/.env.local` tells the browser where to reach the API:

```
NEXT_PUBLIC_API_URL=http://abroadly.online:8000
```

(Once HTTPS is set up, change to `https://abroadly.online/api`.)

### 4. Run setup

```bash
bash infra/setup-vps.sh
```

Installs Python 3.11, Node, Postgres, builds venv, installs deps, builds Next.js, registers and starts systemd units.

### 5. Wire up Plesk nginx

Plesk → Domain → **Apache & nginx Settings** → **Additional nginx directives** — paste the contents of `infra/nginx/abroadly.conf` and click OK.

### 6. Verify

```bash
systemctl status abroadly-api abroadly-web
curl http://127.0.0.1:8000/health      # → {"status":"ok","env":"prod"}
curl -I http://127.0.0.1:3000          # → HTTP/1.1 200 OK
curl -I http://abroadly.online         # → HTTP/1.1 200 OK (via Plesk nginx)
```

Then open `http://abroadly.online` in a browser and complete onboarding → chat.

---

## Ongoing deploys

After first-time setup, every deploy is one command:

```bash
cd /var/www/vhosts/abroadly.online/httpdocs/abroadly
./deploy.sh
```

`deploy.sh` does: `git pull main` → reinstall any new deps → rebuild frontend → restart both systemd services → health-check.

---

## Seeding the knowledge base

The eval layer refuses queries when retrieval finds nothing. Seed real content:

```bash
cd backend
./venv/bin/python scripts/seed_knowledge.py
```

(TODO: script is currently a stub — needs actual study-abroad content.)

---

## Logs

- `/var/log/abroadly-api.log` — uvicorn / FastAPI
- `/var/log/abroadly-web.log` — Next.js
- Live tail via systemd: `journalctl -u abroadly-api -f`

---

## Troubleshooting

**"Service won't start"** → `journalctl -u abroadly-api -n 50` shows the real error.

**"ModuleNotFoundError / ImportError"** → venv is broken (often from being copied between machines). Rebuild:
```bash
cd backend
rm -rf venv
/usr/bin/python3.11 -m venv venv
./venv/bin/pip install -r requirements.txt
systemctl restart abroadly-api
```

**"Backend works on curl, frontend errors in browser"** → `frontend/.env.local` has a `NEXT_PUBLIC_API_URL` the browser can't reach. The browser needs an externally-reachable URL (NOT `localhost`). Fix the env, then `npm run build && systemctl restart abroadly-web`.

**"Permission denied on systemctl"** → you're not root.

**"dubious ownership" git error** → Plesk owns the vhost dir as a different user:
```bash
git config --global --add safe.directory /var/www/vhosts/abroadly.online/httpdocs/abroadly
```

---

## Backups

```bash
# Nightly via cron
pg_dump abroadly > /backups/abroadly-$(date +%F).sql

# Weekly
tar -czf /backups/chroma-$(date +%F).tar.gz \
    /var/www/vhosts/abroadly.online/httpdocs/abroadly/backend/chroma_db
```

---

## Known issues (worth fixing soon)

- Services run as `root` — should be a dedicated app user. Plesk vhost ownership complicates this; resolve after we move secrets to `/etc/abroadly/.env`.
- No SSL yet (Let's Encrypt was rate-limited). Retry via Plesk's "SSL/TLS Certificates" panel.
- Knowledge base is empty; eval will refuse most queries until `seed_knowledge.py` is real.
