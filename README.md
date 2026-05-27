# Abroadly

Free, opensource AI support for students from Nepal (and South Asia) who want to study abroad.

Most consultancies charge significant fees for advice and document help that students can do themselves with the right guidance and direct links to the official sources. Abroadly is the alternative: an AI that's grounded in real study-abroad knowledge, refuses to guess when it doesn't know, and points students at the actual official portals (universities, embassies, IRCC / DHA / UCAS / Common App / Education USA / DAAD) instead of routing them through paid middlemen.

**Live:** http://abroadly.online
**License:** MIT (see [LICENSE](LICENSE))

## Why this exists

A typical Nepali student pays NPR 50,000–200,000 to a consultancy for help that's mostly: explaining IELTS bands, comparing universities, drafting an SOP, listing documents, and answering visa questions. All of that information is public. Abroadly makes it free, in plain language, in the student's preferred mix of English and Nepali/Hinglish.

The core technical idea is **refusal-first**: the AI doesn't answer when it doesn't have the evidence. That's the trust contract — students can rely on the answers they do get, and never get sent to fill out a visa form by a model hallucinating the deadline.

## Stack

- **Backend:** Python 3.11, FastAPI (async), SQLAlchemy + asyncpg, ChromaDB
- **LLMs:** Groq llama-3.3-70b primary, Gemini 1.5 flash fallback, Gemini embeddings
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind 4
- **Infra:** Hostinger VPS (AlmaLinux 9), Plesk + nginx, Postgres 16, systemd

## Read first

- `AGENTS.md` — briefing for any AI collaborator (Claude, Codex, Cursor, etc.)
- `docs/(C) ARCHITECTURE.md` — system shape and data flows
- `docs/(C) EVAL-LAYER-SPEC.md` — the refusal-first eval layer (the killer feature)
- `docs/(C) ROADMAP.md` — phased build plan
- `infra/DEPLOY.md` — VPS deployment guide + GitHub Actions auto-deploy
- `PROMPT_FOR_CLAUDE_MAX.md` — strategic briefing for AI sessions continuing the build

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

See `infra/DEPLOY.md`. The default path is GitHub Actions auto-deploy on push to `main`; manual `./deploy.sh` on the VPS is the escape hatch.

## Contributing

Opensource — issues and PRs welcome. Read `AGENTS.md` and `docs/(C) ARCHITECTURE.md` first; the architecture decisions (refusal-first eval, provider abstraction, per-student Chroma isolation) are load-bearing and shouldn't be circumvented without discussion.
