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

There are two paths. **CI is the default for any merge to `main`.** Manual is the escape hatch for hotfixes when CI is broken or for first-time bring-up.

### Path A — Auto-deploy via GitHub Actions (default)

Defined in `.github/workflows/deploy.yml`. On every push to `main`:

1. Runner SSHes to the VPS using a deploy key.
2. Runs `./deploy.sh` (same script as manual).
3. Smoke-tests `http://abroadly.online/` and `:8000/health`, fails the workflow if either returns non-200.

Required GitHub repo secrets (Settings → Secrets and variables → Actions):

| secret             | example value                                                 |
| ------------------ | ------------------------------------------------------------- |
| `VPS_HOST`         | `187.124.27.168` (or `abroadly.online`)                       |
| `VPS_PORT`         | `22` (Hostinger sometimes uses non-standard ports — verify)   |
| `VPS_USER`         | `root` (until we cut over to a dedicated app user)            |
| `VPS_SSH_KEY`      | private half of the deploy keypair (ed25519, no passphrase)   |
| `VPS_KNOWN_HOSTS`  | output of `ssh-keyscan -p <port> <host>` from a trusted box   |
| `VPS_DEPLOY_PATH`  | optional override; defaults to `/var/www/vhosts/abroadly.online/httpdocs/abroadly` |

One-time key provisioning (do once, never commit the private key anywhere):

```bash
# locally
ssh-keygen -t ed25519 -f ~/.ssh/abroadly_deploy -N '' -C 'github-actions-deploy'

# put the public key on the VPS (via Hostinger MCP VPS_attachPublicKeyV1,
# or manually paste into /root/.ssh/authorized_keys)

# fingerprint the host for known_hosts
ssh-keyscan -p <port> <host>     # paste output into VPS_KNOWN_HOSTS

# paste private key contents (cat ~/.ssh/abroadly_deploy) into VPS_SSH_KEY
```

Trigger manually: GitHub → Actions → "Deploy to VPS" → Run workflow.

### Path B — Manual SSH (escape hatch)

```bash
ssh root@abroadly.online
cd /var/www/vhosts/abroadly.online/httpdocs/abroadly
./deploy.sh
```

`deploy.sh` does: `git pull main` → reinstall any new deps → rebuild frontend → restart both systemd services → health-check.

**Never run `deploy.sh` and CI deploy simultaneously** — the workflow uses a `concurrency` group to serialize itself, but it doesn't know about a human SSH session.

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
