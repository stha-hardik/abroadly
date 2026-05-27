# Abroadly Roadmap

Action-based phases. Each phase ships an artifact + exit criteria you can grade.

**Mission reminder (read first):** Abroadly is the free, opensource alternative to paid study-abroad consultancies for South Asian students. Anything here that smells like "route the student to a paid third party" is the wrong direction.

---

## Phase 0 — Scaffold (DONE)

**Goal:** Repo exists, tree is right, git initialized, env shape documented.

---

## Phase 1 — Backend MVP with eval-layer-first chat (DONE)

**Goal:** A POST `/chat` that runs the eval layer BEFORE generation. Refusal-first: if any of (knows / reliable / in-scope) fails, no answer is generated.

---

## Phase 2 — OCR upload pipeline (DONE)

**Goal:** Student uploads transcript/cert → text extracted → chunked → stored under that student's namespace → injected into chat context.

---

## Phase 3 — Frontend wired end-to-end (DONE)

**Goal:** A student can do the full flow in the browser: onboarding → chat → upload → get an answer.

---

## Phase 4 — Hostinger VPS deploy + smoke test (DONE)

**Goal:** Live URL, reachable from anywhere. GitHub Actions auto-deploy on push to `main`.

---

## Phase 5 — Smarter replies + conversation memory (DONE in pivot pass)

**Goal:** Replies feel like a competent guide, not a search box.

**Scope:**
- `chat_turns` table + history persistence + frontend restore-on-refresh
- System prompt rewritten for student-direct mission (no consultancy framing)
- Partial-answer mode: when retrieval is thin but in-scope, generate a gap-honest answer with explicit pointer to the official source — instead of bare refusal
- Generation params bumped (max_tokens 600 → 2000, history support)
- Refusal/escalate templates point at official authorities (doctor / lawyer / financial advisor / embassy / IRCC / DHA), never consultancies

**Exit criteria:**
- [x] Refresh `/chat` and the thread is restored
- [x] LLM sees prior turns and answers in-context
- [x] No occurrence of "consultancy" in refusal/escalate templates
- [x] Partial-answer mode is wired through chat.py → generator.py → llm.py

---

## Phase 6 — Seed the knowledge base (NEXT)

**Goal:** The eval layer stops refusing because there's actual content.

**Scope:**
- `scripts/seed_knowledge.py`: real seeder, not a stub. Pulls from a curated list of authoritative sources (university registrars, government immigration portals, public scholarship pages).
- Chunking: 1000 chars / 200 overlap. Per-chunk metadata: `{source_url, title, country, topic, last_fetched}`.
- Coverage targets at minimum: Australia, Canada, UK, USA, Germany. IELTS/TOEFL/PTE bands. Top 20 destination-country scholarships for international students. Visa basics for each country. Document checklists.
- Re-runnable: deduplicate by `source_url`.

**Exit criteria:**
- [ ] `seed_knowledge.py` runs to completion and writes ≥ 500 chunks to Chroma `kind=global`
- [ ] Common student queries ("IELTS for Canada masters?", "scholarships for Nepali students Germany?", "Australia 491 visa?") return PROCEED, not LOW_CONFIDENCE
- [ ] Every chunk has a citable `source_url` in metadata

---

## Phase 7 — Nepali-Hinglish language normalization

**Goal:** Student types Hinglish/Nepali-romanized → AI replies in clean English (or Nepali, if profile preference).

**Scope:** Insert `LanguageNormalizer` step before retrieval in the chat pipeline. Already reserved as a no-op hook. Small LLM call (Gemini flash) with study-abroad-specific few-shots. Cache by hash.

**Exit criteria:**
- [ ] "ma australia janu cha kasari?" → retrieval runs on normalized English → answer in English
- [ ] Audit logs both original and normalized query
- [ ] Cache hit rate > 30% after a week of real traffic

---

## Phase 8 — Document intelligence

**Goal:** Uploaded transcripts get parsed into structured fields, not just dumped into Chroma.

**Scope:**
- `student_documents` table: `id, student_id, doc_type, parsed_fields JSONB, raw_text, created_at`
- Parsers for transcript (subjects, grades, GPA, institution, year), passport (name, DOB, expiry), language test certificates (IELTS/TOEFL band breakdown)
- Eval layer reads structured fields and uses them in generation: "your GPA of 3.2 from Tribhuvan qualifies you for..."

**Exit criteria:**
- [ ] Upload a real Nepali transcript → `parsed_fields.gpa` and `parsed_fields.institution` populated
- [ ] Chat answer references parsed values, not just retrieved chunks

---

## Phase 9 — Application copilot mode

**Goal:** Once a student picks a specific program, the chat becomes a turn-by-turn copilot through the application.

**Scope:**
- New "mode" parameter on `/chat` (or new endpoint): `application_copilot`
- Stateful flow: required-docs checklist, SOP drafting against student profile + uploaded docs, deadline tracker, fee calculator
- Every action links to the official portal — no consultancy intermediary
- Refusal-first still applies — when copilot doesn't know a deadline or fee, it says so and links the official source

**Exit criteria:**
- [ ] Student picks "University of Melbourne — MSc Data Science" → copilot produces personalized checklist
- [ ] SOP draft uses student's actual GPA, target program, and uploaded transcript
- [ ] At every step, an official-portal URL is shown — no consultancy mentions

---

## Phase 10 — WhatsApp channel + voice

**Goal:** Meet students where they are (WhatsApp, often voice notes).

**Scope:**
- WhatsApp Business API webhook → same chat pipeline
- Whisper for Nepali STT, ElevenLabs (or equivalent) for TTS
- Per-WhatsApp-user mapping to `students` table

**Exit criteria:**
- [ ] A real Nepali student sends a voice note in Nepali to the WhatsApp number → gets a coherent English (or Nepali) reply citing real sources
- [ ] Same audit trail as web

---

## Phase 11 — Self-host kit

**Goal:** Because we're opensource, a developer in Bangladesh, Sri Lanka, India, or Pakistan can fork, swap the locale, and run their own instance in an afternoon.

**Scope:**
- `docker-compose.yml` with backend + Postgres + Chroma + frontend
- `LOCALES.md` explaining what to change for a new locale (system prompt, scope keywords, seed list, currency, language normalizer few-shots)
- Smoke-tested fork checklist

**Exit criteria:**
- [ ] One external contributor stands up an instance for a new country and reports back
