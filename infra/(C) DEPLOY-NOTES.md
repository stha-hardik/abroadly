# Deploy notes — Hostinger VPS

Notes only. No scripts yet. Wired in Phase 4.

## Target shape

- Single VPS (cheapest Hostinger KVM that hits 2 vCPU / 4GB)
- Ubuntu 22.04 LTS
- nginx as reverse proxy + TLS via certbot
- Postgres 16 on the same box (no separate managed DB at MVP)
- Chroma persisted to `/var/lib/abroadly/chroma_db`
- App user: `abroadly` (non-root)

## Process model

- Backend: `uvicorn app.main:app --workers 2` under systemd
- Frontend: `next build && next start -p 3000` under systemd (or static export if we can)
- nginx routes:
  - `/api/*` -> uvicorn :8000
  - `/*`     -> next :3000

## Plesk

Plesk is fine if it doesn't fight us. The pattern works without it. Decide at deploy time — don't pre-commit to Plesk.

## Secrets

- `.env` lives at `/etc/abroadly/.env`, mode 600, owned by `abroadly`
- systemd unit reads it via `EnvironmentFile=`

## Backups

- `pg_dump` nightly -> Hostinger backup space
- `chroma_db` dir snapshot weekly (small at MVP)

## Phase 4 todos

- [ ] systemd unit files (backend + frontend)
- [ ] nginx site config + certbot
- [ ] Postgres init: db, user, role grants
- [ ] First deploy script (rsync or git pull + restart)
- [ ] Smoke test from outside the box
