# Abroadly

AI-powered student intake layer between Nepali students and study-abroad consultancies.

Free AI guidance (country fit, scholarships, document help) -> qualified students routed to partner consultancies. Revenue is referral/commission.

## Status

Phase 0: scaffold. Not yet deployed. Not on GitHub.

## Stack

- Backend: Python 3.11+, FastAPI, Postgres, ChromaDB, Groq (primary) + Gemini (fallback)
- Frontend: Next.js (App Router), TypeScript
- Deploy target: Hostinger VPS

## Roles

- Hardik: backend architecture (`backend/`, `docs/`, `infra/`)
- Precious: UI/UX + business comms (`frontend/`, partner outreach)

## Run (once deps are installed)

Backend:
```
cd backend
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
cp ../.env.example .env  # fill in keys
uvicorn app.main:app --reload
```
Docs: http://localhost:8000/docs

Frontend:
```
cd frontend
npm install
npm run dev
```

## Read next

- `docs/(C) ROADMAP.md` — phased build plan
- `docs/(C) ARCHITECTURE.md` — system shape
- `docs/(C) EVAL-LAYER-SPEC.md` — the killer feature
