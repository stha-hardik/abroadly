# Abroadly System Reference

Use this file as the first technical reference for future coding prompts in this repo. Read it together with `AGENTS.md` and `infra/DEPLOY.md`.

Last updated: 2026-05-27

## Product Mission

Abroadly is a free, open-source AI study-abroad guidance app for Nepali and South Asian students.

The product stance is important:

- Help students understand admissions, documents, scholarships, visas, timelines, costs, and official next steps.
- Prefer official sources: universities, embassies, government immigration portals, UCAS, Common App, IRCC, DHA, Education USA, DAAD, etc.
- Do not frame Abroadly as a consultancy lead funnel.
- Do not recommend paid consultancies as the default next step.
- If the assistant does not know, it should say so and point students to the official authority.

## Canonical Deployment

The live deployment is Docker/Caddy/GitHub Actions on Hostinger.

- Live site: `https://abroadly.online`
- VPS IP: `193.203.162.63`
- VPS OS: Ubuntu 24.04
- VPS project root: `/opt/abroadly`
- Runtime: Docker Compose
- Production compose file: `docker-compose.prod.yml`
- Public reverse proxy: Caddy
- TLS: Caddy-managed Let's Encrypt
- Deploy trigger: push or merge to GitHub `main`
- Deploy workflow: `.github/workflows/deploy.yml`

The old systemd/nginx/paramiko setup is retired. Do not revive it unless Presish explicitly asks to replace Docker/Caddy.

## Live Container Stack

Production runs four containers:

- `abroadly-caddy-1`: public entrypoint on ports `80` and `443`
- `abroadly-frontend-1`: Next.js app on internal port `80`
- `abroadly-backend-1`: FastAPI app on internal port `8000`
- `abroadly-db-1`: Postgres 16

Caddy routing:

- `https://abroadly.online/` -> frontend
- `https://abroadly.online/api/*` -> backend with `/api` stripped
- `https://abroadly.online/health` -> backend
- `http://abroadly.online/*` -> HTTPS redirect

Important implication: browser/frontend API calls must use `/api/...`, not raw backend paths.

Examples:

- Browser should call `/api/students`, not `/students`
- Browser should call `/api/chat`, not `/chat`
- Browser should call `/api/upload`, not `/upload`

The backend itself still defines routes as `/students`, `/chat`, and `/upload`; Caddy maps public `/api/*` to those backend routes.

## Deployment Flow

Normal flow:

```text
local code change
-> commit/push or API commit to main
-> GitHub Actions
-> SSH to Hostinger VPS
-> cd /opt/abroadly
-> git fetch origin main
-> git reset --hard origin/main
-> docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
-> smoke-test https://abroadly.online/ and /api/health
```

Do not edit code directly on the VPS. The next deploy runs `git reset --hard origin/main` and will erase manual edits.

## Secrets And Environment

Do not commit secrets to git.

Production secrets belong in:

```bash
/opt/abroadly/.env
```

Key names the app expects:

```env
DB_PASSWORD=strong-password
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=...
CORS_ORIGINS=https://abroadly.online,http://abroadly.online,https://www.abroadly.online
```

Notes:

- The Google key variable is `GEMINI_API_KEY`, not `GOOGLE_API_KEY`.
- After changing `/opt/abroadly/.env`, recreate containers that need the new env:

```bash
cd /opt/abroadly
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
```

Current known limitation as of this reference:

- The VPS did not have Groq or Gemini keys configured during the last check.
- Without those keys, full generated AI replies are not enabled.
- Chat can route requests and return clarifications, but rich answers need LLM keys plus a seeded knowledge base.

## Frontend

Path: `frontend/`

Framework:

- Next.js App Router
- React 18
- Tailwind CSS

Important files:

- `frontend/src/app/page.tsx`: landing page
- `frontend/src/app/onboarding/page.tsx`: student profile flow
- `frontend/src/app/chat/page.tsx`: chat UI
- `frontend/src/app/globals.css`: visual system and global CSS
- `frontend/src/lib/api.ts`: typed frontend API client
- `frontend/Dockerfile`: production frontend image
- `frontend/public/images/abroadly-hero.png`: current hero image

Recent frontend state:

- UI was redesigned in a modern Hostinger-inspired SaaS style.
- Landing, onboarding, and chat were updated.
- `frontend/src/lib/api.ts` defaults to `/api` so browser calls hit Caddy/backend correctly.
- `frontend/Dockerfile` copies `/public` into the standalone Next image. Keep that line, or public images will 404 in production.

Frontend verification:

```bash
cd frontend
npm run build
```

For visual checks, test both desktop and mobile. Important pages:

- `/`
- `/onboarding`
- `/chat`

## Backend

Path: `backend/`

Framework:

- FastAPI
- SQLAlchemy async
- Postgres
- Chroma
- Groq primary LLM, Gemini fallback

Important files:

- `backend/app/main.py`: FastAPI app and router registration
- `backend/app/api/onboarding.py`: `/students`
- `backend/app/api/chat.py`: `/chat` and `/chat/history/{student_id}`
- `backend/app/api/upload.py`: `/upload`
- `backend/app/eval/`: refusal-first eval layer
- `backend/app/rag/retriever.py`: Chroma vector retrieval plus local BM25 lexical fallback/ranking
- `backend/app/rag/generator.py`: prompt assembly
- `backend/app/rag/llm.py`: only place Groq/Gemini SDKs should be imported
- `backend/app/prompts/system_prompt.md`: assistant system prompt
- `backend/tests/test_eval.py`: eval tests
- `backend/tests/test_retriever.py`: BM25 fallback and grounding tests

Backend verification:

```bash
backend/venv/bin/python -m pytest backend/tests
```

Inside the production backend container:

```bash
cd /opt/abroadly
docker compose -f docker-compose.prod.yml exec -T backend python -m pytest tests
```

## Chat Pipeline

The chat path is intentionally refusal-first:

```text
normalize/query
-> retrieve from Chroma vector search + BM25 lexical fallback
-> rerank
-> eval
-> generate only if allowed
-> persist audit and turns
```

Key behavior:

- Out-of-scope categories refuse before LLM generation.
- High-stakes actions like filing visas, sending money, signing contracts, or paying tuition should point to official portals.
- Low retrieval confidence should ask a clarifying question or produce a gap-honest partial answer if enough evidence exists.
- The assistant should not invent requirements.

Recent backend fix:

- `scope_check.py` now recognizes common study-abroad terms like `documents`, `study in`, `UK`, `Australia`, `Canada`, `admissions`, `application`, `CAS`, `CoE`, and `student permit`.
- `retriever.py` now uses `rank-bm25==0.2.2` as a small local lexical fallback/ranking signal, so exact terms like `CAS`, `CoE`, `IELTS`, and `GTE` can surface relevant Chroma chunks even when Gemini embedding search is unavailable or weak.
- `confidence.py` now counts short study-abroad terms such as `UK`, `CAS`, and `CoE` during grounding checks.
- A normal question like "What documents do I need to study in the UK?" should not be `out_of_scope`.
- With no seeded knowledge, that question currently returns `low_confidence` clarification instead of a full answer.
- `llm.py` now returns a graceful provider-configuration message if both Groq and Gemini keys are absent.

## API Smoke Tests

Health:

```bash
curl -sS https://abroadly.online/api/health
```

Create student:

```bash
curl -sS -H 'Content-Type: application/json' \
  -d '{
    "full_name":"Test Student",
    "email":"test@example.com",
    "education_level":"plus_two",
    "target_countries":["UK"],
    "preferred_field":"Computer Science",
    "goals":"Testing chat"
  }' \
  https://abroadly.online/api/students
```

Chat:

```bash
curl -sS -H 'Content-Type: application/json' \
  -d '{
    "student_id":"PASTE_STUDENT_ID",
    "message":"What documents do I need to study in the UK?"
  }' \
  https://abroadly.online/api/chat
```

Expected current shape before keys and knowledge seeding:

- HTTP `200`
- `decision` should be `low_confidence`, not `out_of_scope`
- The response may ask for clarification or say generation is not configured

Expected future shape after keys and knowledge seeding:

- HTTP `200`
- useful answer
- official-source guidance
- sources when retrieved evidence exists

## Known Prior Issues And Fixes

Issue: browser showed a long Next.js 404 HTML response for `/students`.

Cause:

- Frontend called `/students`, which hit the Next app instead of the backend.

Fix:

- `frontend/src/lib/api.ts` defaults API base to `/api`.

Issue: hero image worked locally but not live.

Cause:

- Next standalone Docker image did not copy `public/`.

Fix:

- `frontend/Dockerfile` copies `/app/public` into `/app/public`.

Issue: backend crashed on startup due asyncpg multi-statement SQL.

Cause:

- `CREATE TABLE ...; CREATE INDEX ...;` was sent as one prepared statement.

Fix:

- `backend/app/core/db.py` splits the chat turns index creation into its own execute call.

Issue: normal study-abroad question was falsely refused as out-of-scope.

Cause:

- Scope rules were too narrow and strict.

Fix:

- Expanded allow patterns and added tests.

## Working Rules For Future Coding Prompts

When Presish asks for frontend/UI work:

- Inspect existing frontend files first.
- Keep the current premium SaaS visual direction unless asked otherwise.
- Run `npm run build`.
- Check mobile and desktop render if possible.
- Do not break `/api` routing.

When Presish asks for backend/replies/chat:

- Start with `backend/app/api/chat.py`, `backend/app/eval/`, `backend/app/rag/`, and `backend/app/prompts/system_prompt.md`.
- Preserve refusal-first behavior.
- Add or update tests in `backend/tests`.
- Verify `/api/students` and `/api/chat` live after deploy.
- Check whether `GROQ_API_KEY` and `GEMINI_API_KEY` are configured before assuming generation can work.

When Presish asks for deploy/hosting:

- Treat Docker/Caddy/GitHub Actions as canonical.
- Check GitHub Actions and live health.
- Be careful with `.github/workflows/deploy.yml`, `docker-compose.prod.yml`, `Caddyfile`, and Dockerfiles.
- Do not put secrets in git.

When Presish asks for knowledge/research/replies:

- Build official-source content.
- Seed Chroma with structured, cited chunks.
- Improve retrieval and prompt behavior only after retrieval data exists.
- Prefer narrow, testable additions before large framework swaps. A LiteLLM provider layer is architecturally useful, but a March 2026 PyPI compromise means it should only be considered with pinned/locked dependencies and extra review.
- The assistant should be helpful but gap-honest.

## Immediate Backend Priorities

1. Add `GROQ_API_KEY` and/or `GEMINI_API_KEY` to `/opt/abroadly/.env`.
2. Recreate the backend container.
3. Build real official-source seed content.
4. Implement/upgrade `backend/scripts/seed_knowledge.py`.
5. Verify generated replies with real student questions.
6. Improve Nepali-English mixed question handling.
7. Migrate embeddings from deprecated `google.generativeai` to the newer Google Gen AI SDK.
8. Add tests for chat decisions, LLM fallback, and API route behavior.
