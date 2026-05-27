# HANDOFF.md — Retired

This handoff is intentionally retired.

The old deployment notes that mentioned `systemd` services, `nginx`, and paramiko scripts do **not** describe the live Abroadly server anymore. The canonical production setup is:

- Hostinger VPS: Ubuntu 24.04, `193.203.162.63`
- Project root: `/opt/abroadly`
- Runtime: Docker Compose
- Public entrypoint: Caddy on ports `80` and `443`
- TLS: Caddy-managed Let's Encrypt
- Deploy path: merge/push to `main` → GitHub Actions → SSH → `docker compose -f docker-compose.prod.yml up -d --build --remove-orphans`

Use these files instead:

- `AGENTS.md` — operating rules for AI collaborators
- `infra/DEPLOY.md` — canonical deploy and troubleshooting guide
- `.github/workflows/deploy.yml` — live auto-deploy workflow
- `docker-compose.prod.yml` — production container stack
- `Caddyfile` — HTTPS reverse-proxy config

Do not tear down Docker/Caddy to recreate the old `systemd`/`nginx` setup unless a human explicitly reverses this decision.
