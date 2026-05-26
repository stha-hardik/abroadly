# Abroadly Roadmap

Action-based phases. Each phase ships an artifact + exit criteria you can grade.

---

## Phase 0 — Scaffold (DONE on scaffold)

**Goal:** Repo exists, tree is right, git initialized, env shape documented.

**Exit criteria:**
- [ ] `git status` shows clean working tree after first commit
- [ ] `.env.example` lists every key the backend will read
- [ ] `uvicorn app.main:app --reload` returns 200 on `GET /health` (after `pip install`)
- [ ] `npm run dev` boots the frontend at :3000 (after `npm install`)

---

## Phase 1 — Backend MVP with eval-layer-first chat

**Goal:** A POST `/chat` that runs the eval layer BEFORE generation. Refusal-first: if any of (knows / reliable / in-scope) fails, no answer is generated.

**Scope (/goal-fireable):**
- `app/api/onboarding.py`: POST `/students`, GET `/students/{id}`, PUT `/students/{id}`
- `app/api/chat.py`: POST `/chat` -> retrieve -> evaluate -> (generate | refuse | escalate)
- `app/eval/*`: implement `evaluator.evaluate()` returning `EvalDecision`
- `app/rag/retriever.py` + `generator.py`: Chroma retrieval + Groq/Gemini generation
- `app/core/db.py`: async Postgres engine + Chroma client singletons
- Seed script: `scripts/seed_knowledge.py` to load sample study-abroad docs into Chroma

**Exit criteria:**
- [ ] `POST /chat {"student_id": ..., "message": "What IELTS score do I need for Canada?"}` returns a grounded answer with `sources[]`
- [ ] Same endpoint with `"message": "Should I take this medication?"` refuses with `scope_violation`
- [ ] Same endpoint with low-evidence query returns `low_confidence` and a clarifying question
- [ ] OpenAPI docs at `/docs` show typed request/response models
- [ ] `pytest tests/test_eval.py` passes (stub-level)

---

## Phase 2 — OCR upload pipeline

**Goal:** Student uploads transcript/cert -> text extracted -> chunked -> stored under that student's namespace -> injected into chat context.

**Scope:**
- `app/api/upload.py`: POST `/upload` (multipart, max 15MB)
- `app/rag/ocr.py`: PDF (PyPDF2) + image (pytesseract) extraction
- Per-student Chroma metadata filter (`student_id`)
- Chat retrieval prepends student-specific docs to the retrieval set

**Exit criteria:**
- [ ] Upload a sample PDF transcript -> text appears in Chroma under that `student_id`
- [ ] Chat answer references uploaded transcript content when relevant

---

## Phase 3 — Frontend wired end-to-end

**Goal:** A student can do the full flow in the browser: onboarding -> chat -> upload -> get an answer.

**Scope:**
- `/onboarding` page: typed form -> POST `/students`
- `/chat` page: message list + input, calls POST `/chat`
- Upload widget inside chat -> POST `/upload`
- Typed API client in `src/lib/api.ts` (hand-written or generated from OpenAPI)

**Exit criteria:**
- [ ] First-time user can go from `/` -> finish onboarding -> ask a question -> upload a doc -> see grounded answer
- [ ] No console errors in happy path

---

## Phase 4 — Hostinger VPS deploy + smoke test

**Goal:** Live URL, reachable from Precious's laptop.

**Scope:**
- systemd unit for uvicorn (or pm2-style) + nginx reverse proxy
- Postgres on same VPS, Chroma persisted to disk
- Frontend built (`next build`) and served behind same nginx
- Plesk only if it doesn't fight the setup; raw nginx is fine

**Exit criteria:**
- [ ] `curl https://<domain>/health` returns 200 from outside the VPS
- [ ] One real end-to-end test against the live URL passes

---

## Phase 5 — Nepali-English language normalization (FUTURE)

**Goal:** Student types Hinglish/Nepali-romanized -> AI replies in clean English.

**Scope:** Insert `LanguageNormalizer` step before retrieval in the chat pipeline. Already reserved as a no-op hook in Phase 1 architecture.

**Exit criteria:**
- [ ] "ma australia janu cha kasari?" -> retrieval runs on normalized English -> answer is in English

---

## Phase 6 — Consultancy matching engine + commission (FUTURE)

**Goal:** When a student crosses qualification thresholds, surface matched consultancies + log a referral event.

**Scope:** `app/matching/` module, partner registry table, referral event log, basic admin view.

**Exit criteria:**
- [ ] Qualified student sees 1-3 partner cards in chat
- [ ] Click-through writes a `referral` row with student_id + partner_id + timestamp
