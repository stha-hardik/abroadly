# Abroadly — Build Prompt for Claude / Codex / next-gen AI

You are being handed an early-stage, opensource product called **Abroadly** and asked to evolve it from a working MVP into the de facto free alternative to study-abroad consultancies for South Asian students. The MVP works. It's live. Now we level up.

Read this whole prompt before touching code. Then read the codebase yourself — don't trust this doc to be complete.

---

## The product in one paragraph

Abroadly is a **free, opensource AI guidance assistant** for students from Nepal (and elsewhere in South Asia) who want to study abroad. Many students pay consultancies large fees for advice and document help that's mostly public information. Abroadly is the alternative — a grounded AI that answers honestly when it has the evidence, refuses to guess when it doesn't, and points students at **official sources** (universities, embassies, IRCC / DHA / UCAS / Common App / Education USA / DAAD) — **never at a consultancy**. Live at **http://abroadly.online**. Repo: **https://github.com/stha-hardik/abroadly**. License: **MIT**.

---

## What this is NOT (read this twice)

- **NOT a referral funnel.** Earlier drafts of this codebase routed "qualified" students to partner consultancies for commission. That model is dead. Anywhere you see `consultancy`, `referral`, or `ESCALATE → suggest a consultancy`, it's leftover and should be replaced with an official-source pointer.
- **NOT an ad platform.** We don't sell student data. We don't take affiliate fees from universities. We don't recommend specific paid services.
- **NOT a generic chatbot.** The refusal-first eval is the moat. It's what makes students trust an AI with their visa documents.

---

## What exists (read fast, then verify in the code)

- **Frontend:** Next.js 14 App Router, React 18, TypeScript, Tailwind 4. Three pages: `/`, `/onboarding` (3-step form), `/chat` (messages + upload, with conversation history persisted across refresh). Dark theme (gray-950 / emerald). API client in `frontend/src/lib/api.ts`.
- **Backend:** FastAPI / Python 3.11, async end-to-end. Routes in `backend/app/api/{onboarding,chat,upload}.py`.
- **The killer feature — eval layer** in `backend/app/eval/`. Pure function: `(query, student_ctx, retrieved) -> EvalDecision`. Three checks (scope / retrieval-score / grounding-overlap) plus a high-stakes pointer to official portals. **No LLM generation happens unless eval says PROCEED — or LOW_CONFIDENCE with partial-answer mode.** This is the moat. Read `docs/(C) EVAL-LAYER-SPEC.md` before changing anything here.
- **Partial-answer mode:** when retrieval is thin but in-scope (`PARTIAL_ANSWER_MIN_SCORE <= retrieval < MIN_RETRIEVAL_SCORE`), the generator still runs in a gap-honest mode that names what's missing and points at the authoritative source.
- **RAG:** ChromaDB with two namespaces via metadata (`kind=global` seeded knowledge, `kind=student` user uploads). Groq llama-3.3-70b primary, Gemini 1.5 flash fallback, Gemini embeddings. All vendor calls funnel through `backend/app/rag/llm.py`.
- **Conversation memory:** `chat_turns` table persists every user + assistant message; `/chat/history/{student_id}` returns it; the LLM gets the last 10 turns of context.
- **Storage:** Postgres (`students`, `chat_audit`, `chat_turns`) + Chroma on disk.
- **Infra:** Hostinger VPS (AlmaLinux 9, IP 187.124.27.168), nginx :80 → Next.js :3000, FastAPI on :8000, Postgres local. GitHub Actions auto-deploy on push to `main`. No SSL yet (Let's Encrypt rate-limited). No systemd units yet — services run as background processes and don't survive reboot.

Working dir: `/Users/presish/Desktop/Website/Abroadly.online/abroadly`. Push to a branch, PR to `main`.

---

## Operating principles (these are load-bearing — don't violate)

1. **Refusal-first.** The eval layer is the product. Never lower thresholds to make the model talk more. If the answer quality is bad, fix retrieval or fix the knowledge base — don't make the model hallucinate.
2. **Pipeline stays clean:** `normalize → retrieve → rerank → eval → generate`. Each step swappable in isolation. Don't merge concerns into `chat.py`.
3. **Provider abstraction:** Groq/Gemini SDK imports live ONLY in `backend/app/rag/llm.py`. Anywhere else is a bug.
4. **Audit everything.** Every chat turn writes scores, decisions, chunk IDs to `chat_audit`. We tune thresholds from data, not vibes.
5. **Async-first.** No sync IO on the request path.
6. **Per-student isolation** via Chroma metadata filter, not separate collections.
7. **No consultancy framing, ever.** This is the new product mission. If you find old framing in a prompt, template, or doc, replace it as part of whatever change you're making.

---

## What I want you to do (priorities, sharpest first)

### Tier 0 — Make the existing product actually good

The MVP is wired up. Now make replies genuinely useful and the infra reliable.

- **Seed the knowledge base.** The eval layer refuses (or partial-answers) most queries because retrieval scores stay low. We need real study-abroad content: country pages (Australia, Canada, UK, US, Germany), IELTS/TOEFL/PTE requirement tables, scholarship listings, visa basics, document checklists, embassy contacts. Write `scripts/seed_knowledge.py` to ingest a curated corpus. Source the content yourself from authoritative public sources (university registrars, government immigration sites), cite them in metadata, and chunk sensibly (1000 chars / 200 overlap).
- **No systemd units yet.** First reboot kills the site. Write `infra/systemd/abroadly-api.service` and `abroadly-web.service`, document `systemctl enable`.
- **SSL.** Retry Let's Encrypt. Update CORS once the domain is on HTTPS.
- **Rate limiting.** Add per-IP and per-`student_id` limits on `/chat` and `/upload`. Use `slowapi` or roll a Redis token-bucket.
- **Privacy policy + DPA.** Opensource doesn't mean privacy-policy-optional. Students upload transcripts. Document what we store, for how long, who can see it, and how to request deletion.

### Tier 1 — Features that make this genuinely better than a consultancy

- **Phase 5 — Nepali-Hinglish normalization.** The hook is already reserved in the pipeline. Build a `LanguageNormalizer` that handles Nepali-romanized ("ma australia janu cha kasari?"), Hindi-romanized, and mixed code-switching. Approach: small LLM call (Gemini flash, cheap) with a tight system prompt and few-shot examples specific to study-abroad vocabulary. Cache normalizations by hash. Log original + normalized in audit so we can grade quality. Reply language stays English unless the student opts otherwise in their profile.
- **Document intelligence beyond OCR.** Right now upload just dumps text into Chroma. Make it smart: when a transcript is uploaded, *parse it* (subjects, grades, GPA, institution) and write structured fields to a `student_documents` table. Then the eval layer can use real data ("your GPA is 3.2, here's what that qualifies you for") instead of hoping retrieval surfaces it.
- **Scholarship engine.** Active, structured scholarship database (not just retrieved blobs). Cron-scrapes a curated list of authoritative sources (government scholarship pages, university financial aid pages, well-known foundations). Eligibility-matched against student profile. The eval layer can confidently say "you qualify for X, Y, Z" with citations.
- **Application copilot mode.** A student picks a specific program. The agent walks them turn-by-turn through the application: required documents, SOP draft assistance grounded in their profile + uploaded docs, deadline tracker, fee calculator, link to the official portal at every step. This is a *different mode* of the chat — propose how it fits into the existing pipeline without breaking the refusal-first contract.

### Tier 2 — Bigger swings (push back, redesign, or sequence differently — but make the case)

- **WhatsApp channel.** Nepali students live on WhatsApp. Wrap the same backend behind a WhatsApp Business API webhook. Same eval layer, same audit trail, different surface. This is probably how Abroadly actually wins the market.
- **Voice in Nepali.** Whisper for STT (handles Nepali), TTS via a provider that does Nepali (ElevenLabs has it). Mobile-web first, WhatsApp voice notes second.
- **Self-host kit.** Since we're opensource — make it easy for someone in Bangladesh, Sri Lanka, India, or Pakistan to fork, swap the locale, and run their own instance. One-command Docker compose, a `LOCALES.md` explaining what to change.

### Tier 3 — Polish that compounds

- Profile/dashboard page where students view & edit their data and see their conversation history grouped by topic.
- Toast notifications, loading states, error boundaries. Mobile-first audit of every page.
- Conversation export (PDF) so students can take the AI's notes with them.
- Observability: structured logs, a `/metrics` endpoint, maybe Sentry.
- Generate the typed API client from the OpenAPI spec instead of hand-maintaining `lib/api.ts`.

---

## How I want you to work

- **Read before you write.** Especially `docs/(C) ARCHITECTURE.md`, `docs/(C) EVAL-LAYER-SPEC.md`, `docs/(C) ROADMAP.md`. The architecture decisions there have reasons — understand them before challenging them.
- **One change, one commit, clear message.** No "wip" or "stuff." Reference the tier and feature.
- **Test before pushing.** Backend has a `tests/` dir — add to it. Frontend changes: actually load the page and try the flow.
- **When you finish a chunk, summarize crisply:** what changed, why, what's next. Don't bury the lede.
- **If a Tier 0 blocker conflicts with a fancier Tier 2 idea, do Tier 0 first.** Boring wins.
- **Push back when you should.** If you think a feature is wrong, say so before building it. You have judgment — use it.
- **Don't invent files we don't need.** No README updates, no decision logs, no "ARCHITECTURE_V2.md" unless I ask. Code and commits are the artifacts.
- **Replace consultancy framing on sight.** It's residue from the old business model. If you see "talk to a consultancy" anywhere — prompts, templates, docs, frontend copy — fix it as part of whatever you're already doing.

---

## The bar

The MVP proved the eval-layer pattern works. The next version has to prove the *mission*: real students using a free tool, getting abroad without paying middlemen. Every change you make should move us toward that. If it doesn't, ask whether it's worth doing.

You're not here to be a maintenance bot. You're here to ship something students actually rely on.

Start by reading the code, then propose the first three things you'd tackle and why. Don't write code in your first response — earn agreement on the plan, then build.
