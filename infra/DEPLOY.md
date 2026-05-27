# Abroadly — VPS Deploy Guide

Canonical ops reference for the live Abroadly deployment. Pair this with [AGENTS.md](../AGENTS.md), which has the same model from a fresh-AI-session POV.

> **History note.** Earlier versions of this file described an AlmaLinux + Plesk + systemd + nginx setup, and an earlier-still doc (`(C) DEPLOY-NOTES.md`, kept for archival reasons) described a third variant. Both are retired. The live stack is Ubuntu + Docker + Caddy, deployed via GitHub Actions over SSH. Anything that contradicts that is stale.

---

## Architecture on the VPS

```
                              Internet
                                 │
                                 ▼
                         abroadly.online
                       (DNS → 193.203.162.63)
                                 │
                                 ▼
                     +-----------------------+
                     |  Caddy 2 (alpine)     |
                     |  :80 → 308 → :443     |
                     |  auto-Let's-Encrypt   |
                     +----+--------+---------+
                          │        │
              /api/*, /health      │  /*
                          │        │
                          ▼        ▼
                +---------+    +---------+
                | backend |    | frontend|
                | :8000   |    | :80     |
                | FastAPI |    | Next.js |
                +----+----+    +---------+
                     │
                     ▼
                +---------+
                |   db    |
                | :5432   |
                | Pg 16   |
                +---------+
```

- VPS OS: Ubuntu 24.04 LTS, no control panel
- Project root on disk: `/opt/abroadly` (cloned from `https://github.com/stha-hardik/abroadly`)
- Container stack defined by `docker-compose.prod.yml` at the repo root
- Caddy mounts `./Caddyfile` read-only and stores TLS material in two named volumes (`caddy_data`, `caddy_config`)
- Postgres data persists in the `pgdata` named volume

---

## Ongoing deploys (default path)

**Push to `main` = the live site updates within ~1-2 minutes.**

The workflow ([.github/workflows/deploy.yml](../.github/workflows/deploy.yml)):

1. Receives a `push` to `main` (or a manual `workflow_dispatch`)
2. Writes the deploy SSH private key (from `VPS_SSH_KEY`) into the runner
3. SSHes to the VPS using the host pinned in `VPS_KNOWN_HOSTS`
4. Runs on the VPS:
   ```bash
   cd /opt/abroadly
   git fetch origin main
   git reset --hard origin/main
   docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
   ```
5. Smoke-tests `https://abroadly.online/` and `https://abroadly.online/api/health` — both must return 200 within ~80 s

`git reset --hard` makes the VPS working tree identical to `origin/main`. **Never edit files on the VPS directly** — they will be wiped on the next deploy. Push fixes through git.

### Required GitHub Secrets

Settings → Secrets and variables → Actions:

| secret | example | notes |
|---|---|---|
| `VPS_HOST` | `abroadly.online` or `193.203.162.63` | hostname or IP |
| `VPS_PORT` | `22` | confirm in hpanel → VPS → Server details |
| `VPS_USER` | `root` | until we cut over to a non-root app user |
| `VPS_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----…` | ed25519, no passphrase |
| `VPS_KNOWN_HOSTS` | one line per host key | output of `ssh-keyscan -p <port> <host>` |
| `GROQ_API_KEY` | `gsk_…` | optional — set when chat must work |
| `GEMINI_API_KEY` | `AIza…` | optional — fallback LLM + embeddings |
| `DB_PASSWORD` | strong random string | optional — defaults to `abroadly` (insecure) |

### One-time deploy-key provisioning

```bash
# locally — generate a fresh keypair, no passphrase
ssh-keygen -t ed25519 -f ~/.ssh/abroadly_deploy -N '' -C 'github-actions-deploy'

# install the public key on the VPS (one of):
#   - via Hostinger MCP: VPS_createPublicKeyV1 + VPS_attachPublicKeyV1
#   - via hpanel Browser Terminal: append cat ~/.ssh/abroadly_deploy.pub to /root/.ssh/authorized_keys
ssh-keyscan -p <port> <host>     # paste output into VPS_KNOWN_HOSTS

cat ~/.ssh/abroadly_deploy       # paste into VPS_SSH_KEY (the private half)

# then delete the local files
shred -u ~/.ssh/abroadly_deploy ~/.ssh/abroadly_deploy.pub
```

### Manual trigger

GitHub UI: Actions → "Deploy to Hostinger VPS" → **Run workflow**. Or from the CLI:

```bash
gh workflow run deploy.yml -R stha-hardik/abroadly --ref main
```

---

## Manual deploy (escape hatch — when CI is broken)

```bash
ssh root@abroadly.online -p <VPS_PORT>
cd /opt/abroadly
git fetch origin main
git reset --hard origin/main
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
```

Verify after:

```bash
docker compose -f docker-compose.prod.yml ps
curl -fsS https://abroadly.online/api/health     # → {"status":"ok","env":"production"}
curl -fsSI https://abroadly.online/ | head -1     # → HTTP/2 200
```

**Never run manual + CI deploys simultaneously.** The workflow has a `concurrency` group with itself, but it doesn't know about a human SSH session.

---

## First-time bring-up on a fresh VPS

Only needed when the VPS is wiped or replaced — not for ongoing operation.

```bash
# 1. As root on the fresh VPS (Ubuntu 24.04, Docker template)
apt update && apt install -y git
cd /opt
git clone https://github.com/stha-hardik/abroadly.git
cd abroadly

# 2. Project .env at /opt/abroadly/.env (gitignored, manual)
cat > .env <<'EOF'
DB_PASSWORD=<strong-random-string>
GROQ_API_KEY=<gsk_…>
GEMINI_API_KEY=<AIza…>
CORS_ORIGINS=https://abroadly.online,http://abroadly.online,https://www.abroadly.online
EOF
chmod 600 .env

# 3. Bring up the stack — Caddy will request Let's Encrypt certs on first boot
docker compose -f docker-compose.prod.yml up -d --build

# 4. Verify
docker compose -f docker-compose.prod.yml ps
curl -fsS https://abroadly.online/api/health
```

After this, every deploy comes through GitHub Actions.

DNS for `abroadly.online` must point at the VPS IP **before** Caddy boots, or the Let's Encrypt challenge fails and Caddy serves on its self-signed fallback.

---

## Seeding the knowledge base

The eval layer refuses (or partial-answers) most queries until real content is in Chroma. Seed it from inside the backend container:

```bash
ssh root@abroadly.online -p <VPS_PORT>
cd /opt/abroadly
docker compose -f docker-compose.prod.yml exec backend python scripts/seed_knowledge.py
```

`scripts/seed_knowledge.py` is currently a stub — see `docs/(C) ROADMAP.md` Phase 6 for the real seed work.

---

## Logs and observability

```bash
# Tail (live)
docker logs -f abroadly-backend-1
docker logs -f abroadly-frontend-1
docker logs -f abroadly-caddy-1
docker logs -f abroadly-db-1

# Last 200 lines
docker logs --tail 200 abroadly-backend-1

# Container state
docker compose -f docker-compose.prod.yml ps

# Hostinger MCP equivalent (no SSH needed)
#   VPS_getProjectLogsV1 → returns the last 300 lines aggregated across services
```

---

## Troubleshooting

**"Workflow fails on smoke-test"** → backend likely crashed on boot. `docker logs --tail 100 abroadly-backend-1` — usually a missing env var (Groq/Gemini key) or a DB migration that didn't take.

**"Caddy serves self-signed cert / no HTTPS"** → Let's Encrypt challenge failed. Causes: DNS not pointing at the VPS yet, port 80 blocked at the firewall, or rate-limited by Let's Encrypt. Check `docker logs abroadly-caddy-1` for the actual error.

**"docker compose up complains about images"** → registry auth issue. The prod compose builds locally (no GHCR pull), so this usually means a `Dockerfile` regression — check the build output.

**"Push deployed but my change isn't visible"** → check `docker compose ps` for stale containers. `--build --remove-orphans` should rotate them, but verify the running image SHA:
```bash
docker inspect abroadly-backend-1 --format '{{.Image}}'
docker image ls | head
```

**"Manual `git pull` on the VPS shows merge conflicts"** → someone edited files on the VPS. Stop, copy the diff into git, and `git reset --hard origin/main`. Don't keep VPS-side edits.

---

## Backups

The deploy itself is idempotent (always rebuilt from git + the .env), so what needs backup is **state**:

```bash
# Postgres dump
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U abroadly abroadly | gzip > /root/backups/abroadly-$(date +%F).sql.gz

# Chroma + uploads (paths set by env)
docker compose -f docker-compose.prod.yml exec -T backend \
  tar -czf - "$CHROMA_DIR" "$UPLOAD_DIR" > /root/backups/abroadly-data-$(date +%F).tar.gz
```

Wire this into a cron job on the VPS (or migrate to a managed snapshot). TODO.

---

## Known issues (worth fixing soon)

- All containers run as their image-default user (root for the base images). Move backend + frontend to non-root users.
- `DB_PASSWORD` defaults to `abroadly` if the secret isn't set — fine on a closed Docker network but should be rotated to a strong value via the GitHub Secret + the VPS `.env`.
- No automated backups yet; `pg_dump` cron not configured.
- Knowledge base is mostly empty; eval will partial-answer or refuse most queries until `seed_knowledge.py` is real.
- `LOG_LEVEL` and structured logging are not wired in the backend container — `docker logs` shows uvicorn's default format.
