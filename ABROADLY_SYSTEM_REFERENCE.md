# Abroadly System Reference

Use this file as the first technical reference for future coding prompts in this repo. Read it together with `AGENTS.md` and `infra/DEPLOY.md`.

Last updated: 2026-05-27

## Product Mission

Abroadly is a free, open-source AI study-abroad guidance app for Nepali and South Asian students.

- Help students understand admissions, documents, scholarships, visas, timelines, costs, and official next steps.
- Prefer official sources: universities, embassies, government immigration portals, UCAS, Common App, IRCC, DHA, Education USA, DAAD, etc.
- Do not frame Abroadly as a consultancy lead funnel.
- Do not recommend paid consultancies as the default next step.
- If the assistant does not know, it should say so and point students to the official authority.

## Canonical Deployment

The live deployment is Docker/Caddy/GitHub Actions on Hostinger.

- Live site: `https://abroadly.online`
- Admin panel: `https://abroadly.online/admin/login`
- VPS IP: `193.203.162.63`
- VPS OS: Ubuntu 24.04 with Docker
- VPS project root: `/opt/abroadly`
- Runtime: Docker Compose
- Production compose file: `docker-compose.prod.yml`
- Public reverse proxy: Caddy
- TLS: Caddy-managed Let's Encrypt
- Deploy trigger: push or merge to GitHub `main`
- Deploy workflow: `.github/workflows/deploy.yml`

## Live Container Stack

Production runs four containers:

- `abroadly-caddy-1`: public entrypoint on ports `80` and `443`
- `abroadly-frontend-1`: Next.js app on internal port `80`
- `abroadly-backend-1`: FastAPI app on internal port `8000`
- `abroadly-db-1`: Postgres 16

Named Docker volumes:

- `abroadly_pgdata`: Postgres data
- `abroadly_chroma_data`: Chroma vector DB (persists knowledge base across restarts)
- `abroadly_uploads`: Student uploaded documents

Caddy routing:

- `https://abroadly.online/` -> frontend
- `https://abroadly.online/api/*` -> backend with `/api` stripped
- `https://abroadly.online/health` -> backend
- `http://abroadly.online/*` -> HTTPS redirect

Browser/frontend API calls must use `/api/...`, not raw backend paths.

## Deployment Flow

```text
local code change
-> commit/push to main
-> GitHub Actions SSH to VPS
-> cd /opt/abroadly && git pull origin main
-> docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
-> smoke-test https://abroadly.online/ and /api/health
```

Do not edit code directly on the VPS. The next deploy runs `git reset --hard origin/main` and will erase manual edits.

## Secrets And Environment

Do not commit secrets to git.

Production secrets belong in `/opt/abroadly/.env`:

```env
DB_PASSWORD=strong-password
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
CORS_ORIGINS=https://abroadly.online,http://abroadly.online
ADMIN_USERNAME=username
ADMIN_PASSWORD_HASH=<bcrypt hash>
JWT_SECRET=<random string>
GOOGLE_OAUTH_CLIENT_ID=872418947562-...
GOOGLE_OAUTH_CLIENT_SECRET=<Google web client secret>
GOOGLE_OAUTH_REDIRECT_URI=https://abroadly.online/auth/google/callback
```

Current state: Groq + Gemini keys are configured and working. Groq is primary LLM (llama-3.3-70b), Gemini 2.0 Flash is fallback when Groq hits rate limits.

Google OAuth client secrets must stay server-side in `/opt/abroadly/.env` and must be passed only to the backend container. Do not use `NEXT_PUBLIC_*` for the client secret.

## Frontend

Path: `frontend/`

Framework: Next.js 14 App Router, React 18, Tailwind CSS 4, Plus Jakarta Sans font.

### Pages

| Path | File | Description |
|------|------|-------------|
| `/` | `page.tsx` | Landing page with hero, how-it-works, topics |
| `/onboarding` | `onboarding/page.tsx` | Google-only student sign-in entry |
| `/onboarding/details` | `onboarding/details/page.tsx` | One-time post-Google profile details form |
| `/chat` | `chat/page.tsx` | AI chat with document upload panel |
| `/auth/google/callback` | `auth/google/callback/page.tsx` | Google OAuth callback page; exchanges code through backend |
| `/admin/login` | `admin/login/page.tsx` | Admin login |
| `/admin` | `admin/page.tsx` | Admin dashboard with stats |
| `/admin/students` | `admin/students/page.tsx` | Student list with search, last message preview |
| `/admin/students/[id]` | `admin/students/[id]/page.tsx` | Student detail: chat, documents, profile tabs |

### Key Frontend Files

- `frontend/src/lib/api.ts`: typed student-facing API client (defaults to `/api`)
- `frontend/src/lib/admin-api.ts`: admin API client with JWT auth
- `frontend/src/app/globals.css`: visual system — chat bubbles, action chips, doc panel, animations
- `frontend/Dockerfile`: production standalone Next.js image (copies `/public`)

### Chat UI Features

- Premium chat bubble design with AI/User/Counselor avatars
- Animated typing dots while AI thinks
- **Action chips**: AI's "What to do next" suggestions rendered as clickable buttons
  - Question suggestions auto-send as next message
  - Upload suggestions open the document upload panel
- **Document upload panel**: slide-out with 8 categorized doc types, drag-and-drop, image auto-compression, thumbnail preview, compression stats
- **Counselor messages**: green "HC" avatar, distinct styling, loaded from chat history
- `FormattedBody` component: renders bold text, bullet points, strips source references
- Source chips cleaned: raw `.md` filenames stripped, human-readable labels

### Admin UI Features

- JWT auth stored in localStorage
- Dashboard: 6 stat cards, top target countries bar chart, recent students
- Student list: card layout, avatar initials, AI status badge, last message preview, doc count, search, auto-refresh 10s
- Student detail: 3-tab layout
  - **Chat tab**: full conversation, auto-refreshes every 5s, counselor reply input
  - **Documents tab**: list uploaded files with download button
  - **Profile tab**: full student detail with icons
- AI toggle switch per student

## Backend

Path: `backend/`

Framework: FastAPI, SQLAlchemy async, Postgres, Chroma, Groq + Gemini.

### API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/students` | none | Legacy create/upsert student endpoint; current student UI uses Google OAuth |
| `GET` | `/students/{id}` | none | Get student profile |
| `PUT` | `/students/{id}` | none | Update student profile |
| `POST` | `/chat` | none | AI chat (checks ai_paused flag) |
| `GET` | `/chat/history/{student_id}` | none | Chat history for student |
| `POST` | `/upload` | none | Upload document (PDF, TXT, JPG, PNG) |
| `GET` | `/health` | none | Health check |
| `GET` | `/auth/google/login` | none | Redirect student to Google OAuth |
| `POST` | `/auth/google/exchange` | state cookie | Exchange Google code server-side, set student session cookie, and return student profile |
| `GET` | `/auth/me` | student session cookie | Return the current Google-authenticated student |
| `PUT` | `/auth/profile` | student session cookie | Save the one-time student profile details and mark profile completed |
| `POST` | `/auth/logout` | student session cookie | Clear the student session cookie |
| `POST` | `/admin/login` | none | Admin login, returns JWT |
| `GET` | `/admin/stats` | JWT | Dashboard stats |
| `GET` | `/admin/students` | JWT | Paginated student list with search |
| `GET` | `/admin/students/{id}` | JWT | Student detail |
| `GET` | `/admin/students/{id}/chat` | JWT | Full chat history |
| `GET` | `/admin/students/{id}/documents` | JWT | List uploaded documents |
| `GET` | `/admin/students/{id}/documents/{doc_id}/download` | JWT | Download a document |
| `PUT` | `/admin/students/{id}/ai-toggle` | JWT | Pause/resume AI for student |
| `POST` | `/admin/students/{id}/reply` | JWT | Send counselor reply |

### Key Backend Files

- `backend/app/main.py`: FastAPI app, router registration
- `backend/app/api/auth.py`: Google OAuth student sign-in; client secret stays backend-only
- `backend/app/api/chat.py`: chat endpoint with ai_paused check, eval pipeline, audit persistence
- `backend/app/api/onboarding.py`: student create/upsert (duplicate email returns existing)
- `backend/app/api/upload.py`: document upload with OCR (tesseract for images), Chroma indexing
- `backend/app/api/admin.py`: admin API with JWT auth
- `backend/app/core/auth.py`: bcrypt password hashing, JWT create/decode, FastAPI dependency
- `backend/app/core/config.py`: pydantic settings from `.env`
- `backend/app/core/db.py`: Postgres engine, Chroma singleton, table creation + migrations
- `backend/app/models/student.py`: ORM models (StudentModel with ai_paused, ChatTurnModel with counselor role)
- `backend/app/eval/evaluator.py`: three-check eval layer (scope, escalation, confidence)
- `backend/app/eval/scope_check.py`: keyword-based scope classification (greetings, Nepali, study-abroad terms)
- `backend/app/eval/policies.py`: thresholds and refusal templates
- `backend/app/rag/retriever.py`: Chroma vector search + BM25 lexical fallback
- `backend/app/rag/reranker.py`: reranking retrieved chunks
- `backend/app/rag/generator.py`: prompt assembly, source title cleaning, response cleanup
- `backend/app/rag/llm.py`: Groq/Gemini provider with model fallback chain and error logging
- `backend/app/prompts/system_prompt.md`: AI counselor personality and instructions

### Database Schema

```sql
students: id, full_name, email, phone, location, education_level, gpa,
          target_countries (JSONB), preferred_field, goals, ai_paused (bool),
          created_at, updated_at

chat_turns: id, student_id (FK), role ('user'|'assistant'|'counselor'),
            content, eval_decision, created_at

chat_audit: id, request_id, trace_id, student_id, query, normalized_query,
            chunk_ids (JSONB), retrieval_scores (JSONB), eval_decision,
            eval_confidence, model_used, created_at
```

### Chat Pipeline

```text
user message
-> normalize (Gemini Flash: Nepali/Hinglish -> English)
-> check ai_paused flag (if paused, return "counselor reviewing" message)
-> retrieve from Chroma + BM25 fallback
-> rerank
-> eval (scope check -> escalation check -> confidence check)
-> generate (Groq llama-3.3-70b primary, llama-3.1-8b on rate limit, Gemini 2.0 Flash fallback)
-> clean response (strip [Source:...], strip trailing Sources section)
-> persist audit + chat turns
-> return to student
```

### AI Personality

The system prompt defines Abroadly as a warm dai/didi counselor:

- Concise (3-6 sentences), no walls of text
- Understands Nepali/Hinglish naturally
- No source citations in response text (handled by frontend)
- Every answer ends with 3 "What to do next" suggestions, one pushing document upload
- Progressively collects student details (IELTS, GPA, budget, phone) through conversation
- Never recommends consultancies

### Eval Thresholds

```python
eval_min_retrieval_score = 0.35
eval_min_grounding_score = 0.30
eval_scope_strict = False          # unknown scope queries go through, not auto-rejected
PARTIAL_ANSWER_MIN_SCORE = 0.05    # LLM always called for in-scope queries
```

### Knowledge Base

- 194 chunks seeded from UK study-abroad corpus (visa, universities, scholarships, documents, FAQs)
- Seed script: `backend/scripts/seed_knowledge.py`
- Seed data: `backend/seed_data/` (UK corpus in `uk/` directory, 14 markdown files)
- Embeddings: Gemini `gemini-embedding-001` model
- Must reseed after Chroma volume is recreated: `docker exec abroadly-backend-1 python3 scripts/seed_knowledge.py`

### Admin Authentication

- Single admin user, credentials from environment variables
- Default: username `username`, password `7654321a`
- Password stored as bcrypt hash
- JWT tokens (24h expiry) via PyJWT
- All admin endpoints require `Authorization: Bearer <token>` header

### Google Student Sign-In

- Google OAuth is for student sign-in, not admin auth.
- Browser starts at `/api/auth/google/login`.
- Google redirects to `https://abroadly.online/auth/google/callback`.
- The frontend callback page posts the returned `code` and `state` to `/api/auth/google/exchange`.
- The backend validates the HttpOnly state cookie, exchanges the code with Google, requires a verified email, creates/finds the `students` row by email, returns the student id, and sets an HttpOnly `abroadly_student_session` cookie.
- New Google-created students have `profile_completed=false` and are redirected to `/onboarding/details`.
- `/onboarding/details` saves full name, phone, location, education level, current GPA, expected GPA, preferred field, target countries, and goals through `/api/auth/profile`, then sets `profile_completed=true`.
- Completed students skip `/onboarding/details` on future sign-ins and go straight to `/chat`.
- `/chat` refuses students whose `profile_completed` flag is false, so a fresh Google student cannot chat before the profile details are saved.
- The frontend stores `abroadly_student_id` in localStorage for the existing chat API, but profile completion itself is protected by the HttpOnly student session cookie.
- Client secret is never exposed to frontend code.

### Document Uploads

- Stored on disk: `./uploads/{student_id}/{doc_id}.{ext}`
- Supported formats: PDF, TXT, JPG, JPEG, PNG
- Images: OCR via tesseract, auto-compressed client-side before upload (max 1600px, JPEG 70%)
- Text extracted, chunked (300-word windows, 40-word overlap), embedded, indexed in Chroma
- Admin can view and download uploaded documents per student

## API Smoke Tests

Health:

```bash
curl -sS https://abroadly.online/api/health
```

Create student:

```bash
curl -sS -H 'Content-Type: application/json' \
  -d '{"full_name":"Test","email":"test@example.com","education_level":"plus_two","target_countries":["UK"]}' \
  https://abroadly.online/api/students
```

Chat:

```bash
curl -sS -H 'Content-Type: application/json' \
  -d '{"student_id":"PASTE_ID","message":"hello"}' \
  https://abroadly.online/api/chat
```

Expected: warm greeting, 3 next steps, decision `low_confidence` or `proceed`.

Admin login:

```bash
curl -sS -H 'Content-Type: application/json' \
  -d '{"username":"username","password":"7654321a"}' \
  https://abroadly.online/api/admin/login
```

Admin stats:

```bash
curl -sS -H 'Authorization: Bearer TOKEN' \
  https://abroadly.online/api/admin/stats
```

## Known Issues (Resolved)

| Issue | Cause | Fix |
|-------|-------|-----|
| "hello" rejected as out_of_scope | Strict scope mode, no greeting patterns | Added greeting/Nepali patterns, disabled strict mode |
| AI never generates answers | Chroma had 0 docs, retrieval always scored 0 | Seeded 194 chunks, lowered thresholds |
| Groq rate limit → fallback message shown | Both providers silently failed | Added model fallback chain, Gemini 2.0 Flash fallback, error logging |
| .md filenames in AI responses | LLM context had raw filenames | Clean titles in generator, strip in response, clean on frontend |
| Duplicate email crash on re-onboarding | INSERT without upsert logic | Changed to upsert (find existing by email, update) |
| Deprecated google-generativeai SDK | FutureWarning, eventual breakage | Migrated to google-genai SDK |
| Container name conflicts on deploy | Orphaned containers from failed deploys | `docker rm -f` cleanup before compose up |

## Working Rules For Future Coding

When Presish asks for frontend/UI work:

- Read existing files first. Keep the Plus Jakarta Sans / warm minimal design direction.
- Test with `npm run build`. Check mobile and desktop.
- Do not break `/api` routing.
- Chat UI action chips parse from AI's "What to do next" section — keep that contract.

When Presish asks for backend/AI:

- Start with `chat.py`, `eval/`, `rag/`, `prompts/system_prompt.md`.
- Preserve refusal-first eval behavior.
- Check Groq/Gemini keys are configured before assuming generation works.
- After Chroma volume recreate, reseed knowledge base.

When Presish asks for admin:

- Admin pages under `frontend/src/app/admin/`.
- Admin API under `backend/app/api/admin.py`.
- Auth via `backend/app/core/auth.py` (JWT + bcrypt).
- Default credentials: username/7654321a.

When Presish asks for deploy/hosting:

- Docker/Caddy/GitHub Actions is canonical.
- Production compose: `docker-compose.prod.yml`.
- Clean orphaned containers before compose up to avoid conflicts.
- Do not put secrets in git.
- OAuth secrets go in `/opt/abroadly/.env`; after changing them, rebuild/recreate the backend container.

When Presish asks for knowledge/content:

- Build official-source content in `backend/seed_data/`.
- Seed with `docker exec abroadly-backend-1 python3 scripts/seed_knowledge.py`.
- Currently only UK corpus exists. Australia, Canada, etc. need seed data.
