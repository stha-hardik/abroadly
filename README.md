# Abroadly

AI-powered intake layer between Nepali students and study-abroad consultancies.

Free AI guidance (country fit, scholarships, document help) — qualified students get routed to partner consultancies. Revenue is referral commission.

**Live:** http://abroadly.online

## Status

Phase 4 — deployed to a Hostinger VPS, end-to-end flow working. Next up: seed the knowledge base, harden infra (SSL, systemd-only deploys), then Phase 5 (Nepali normalization) and Phase 6 (consultancy matching engine + referral logging).

## Stack

- **Backend:** Python 3.11, FastAPI (async), SQLAlchemy + asyncpg, ChromaDB
- **LLMs:** Groq llama-3.3-70b primary, Gemini 1.5 flash fallback, Gemini embeddings
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind 4
- **Infra:** Hostinger VPS (AlmaLinux 9), Plesk + nginx, Postgres 16, systemd

## Read first

- `docs/(C) ARCHITECTURE.md` — system shape and data flows
- `docs/(C) EVAL-LAYER-SPEC.md` — the refusal-first eval layer (the killer feature)
- `docs/(C) ROADMAP.md` — phased build plan
- `infra/DEPLOY.md` — VPS deployment guide
- `PROMPT_FOR_CLAUDE_MAX.md` — briefing for AI collaborators continuing the build

## Roles

- **Hardik** — backend architecture (`backend/`, `docs/`, `infra/`)
- **Precious** — UI/UX + business comms (`frontend/`, partner outreach)

## Local dev

**Backend:**
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env  # then fill in keys
uvicorn app.main:app --reload
```
Docs at http://localhost:8000/docs

**Frontend:**
```bash
cd frontend
cp .env.local.example .env.local  # then set NEXT_PUBLIC_API_URL
npm install
npm run dev
```
App at http://localhost:3000

## Deploy

See `infra/DEPLOY.md`. After first-time setup, every deploy is `./deploy.sh` on the VPS.
