# Abroadly — Build Prompt for Claude 4.7 MAX

You are Claude 4.7 MAX. You're being handed an early-stage product called **Abroadly** and asked to evolve it from a working MVP into a category-defining AI platform for South Asian students who want to study abroad. The MVP works. It's live. Now we level up.

Read this whole prompt before touching code. Then read the codebase yourself — don't trust this doc to be complete.

---

## The product in one paragraph

Abroadly is the AI intake layer between Nepali students and study-abroad consultancies. Students chat with an AI that's grounded in real study-abroad knowledge (not generic GPT slop) and that *refuses to answer* when it's out of scope, low-confidence, or high-stakes — at which point qualified students get routed to partner consultancies for a referral commission. Free for students, paid by consultancies. Live at **http://abroadly.online**. Repo: **https://github.com/stha-hardik/abroadly**.

---

## What exists (read fast, then verify in the code)

- **Frontend:** Next.js 14 App Router, React 18, TypeScript, Tailwind 4. Three pages: `/`, `/onboarding` (3-step form), `/chat` (messages + upload). Dark theme (gray-950 / emerald). API client in `frontend/src/lib/api.ts`.
- **Backend:** FastAPI / Python 3.11, async end-to-end. Routes in `backend/app/api/{onboarding,chat,upload}.py`.
- **The killer feature — eval layer** in `backend/app/eval/`. Pure function: `(query, student_ctx, retrieved) -> EvalDecision`. Three checks (scope / retrieval-score / grounding-overlap) plus a high-stakes escalate trigger. **No LLM generation happens unless eval says PROCEED.** This is the moat. Read `docs/(C) EVAL-LAYER-SPEC.md` before changing anything here.
- **RAG:** ChromaDB with two namespaces via metadata (`kind=global` seeded knowledge, `kind=student` user uploads). Groq llama-3.3-70b primary, Gemini 1.5 flash fallback, Gemini embeddings. All vendor calls funnel through `backend/app/rag/llm.py`.
- **Storage:** Postgres (`students`, `chat_audit`) + Chroma on disk.
- **Infra:** Hostinger VPS (AlmaLinux 9, IP 187.124.27.168), nginx :80 → Next.js :3000, FastAPI on :8000, Postgres local. `deploy.sh` builds + restarts. No SSL yet (Let's Encrypt rate-limited). No systemd units yet — services run as background processes and don't survive reboot.

Working dir: `/Users/presish/Desktop/Website/Abroadly.online/abroadly`. Push to `main`.

---

## Operating principles (these are load-bearing — don't violate)

1. **Refusal-first.** The eval layer is the product. Never paper over a confidence problem by lowering thresholds. If the answer quality is bad, fix retrieval or fix the knowledge base — don't make the model talk more.
2. **Pipeline stays clean:** `normalize → retrieve → rerank → eval → generate`. Each step swappable in isolation. Don't merge concerns into `chat.py`.
3. **Provider abstraction:** Groq/Gemini SDK imports live ONLY in `backend/app/rag/llm.py`. Anywhere else is a bug.
4. **Audit everything.** Every chat turn writes scores, decisions, chunk IDs. We tune thresholds from data, not vibes.
5. **Async-first.** No sync IO on the request path.
6. **Per-student isolation** via Chroma metadata filter, not separate collections.

---

## What I want you to do (priorities, sharpest first)

### Tier 0 — Stop the bleeding (do these before anything fancy)

These are MVP gaps that will burn us in front of real users. Treat them as blockers.

- **Knowledge base is effectively empty.** The eval layer will refuse most queries because retrieval scores stay below threshold. We need real study-abroad content seeded — country pages (Australia, Canada, UK, US, Germany), IELTS/TOEFL/PTE requirement tables, scholarship listings, visa basics, document checklists. Write `scripts/seed_knowledge.py` to ingest a curated corpus. Source the content yourself from authoritative public sources, cite them in metadata, and chunk sensibly (1000 chars / 200 overlap, mirror Protocol v3).
- **Conversations don't persist.** Refresh = lost thread. Add a `chat_turns` table (`id`, `student_id`, `role`, `content`, `eval_decision`, `created_at`) and have the chat page load history on mount.
- **No systemd units.** First reboot kills the site. Write `infra/systemd/abroadly-api.service` and `abroadly-web.service`, document `systemctl enable`.
- **SSL.** Retry Let's Encrypt. Update CORS once the domain is on HTTPS.
- **Rate limiting.** Add per-IP and per-`student_id` limits on `/chat` and `/upload`. Use `slowapi` or roll a Redis token-bucket.

### Tier 1 — The features that make this defensible

- **Phase 5 — Nepali-Hinglish normalization.** The hook is already reserved in the pipeline. Don't bolt on a generic translator — build a `LanguageNormalizer` that handles Nepali-romanized ("ma australia janu cha kasari?"), Hindi-romanized, and mixed code-switching. Approach: small LLM call (Gemini flash, cheap) with a tight system prompt and few-shot examples specific to study-abroad vocabulary. Cache normalizations by hash. Log original + normalized in audit so we can grade quality. Reply language stays English unless the student opts otherwise in their profile.
- **Phase 6 — Matching engine + referral commission.** When eval returns ESCALATE, attach 1-3 partner consultancy cards. Schema: `partners(id, name, countries[], specializations[], commission_rate, contact_email, active)`, `referrals(id, student_id, partner_id, source_turn_id, status, created_at)`. Matching v1: rule-based on `target_countries ∩ partner.countries` + GPA banding. Click-through on a partner card POSTs `/referrals` and opens the partner's contact channel. Build a basic admin route (`/admin/referrals`) gated by a shared-secret header — auth comes later.
- **Document intelligence beyond OCR.** Right now upload just dumps text into Chroma. Make it smart: when a transcript is uploaded, *parse it* (subjects, grades, GPA, institution) and write structured fields to a `student_documents` table. Then the eval layer can use real data ("your GPA is 3.2, here's what that qualifies you for") instead of hoping retrieval surfaces it.

### Tier 2 — Where Claude 4.7 MAX earns its keep

These are bigger swings. You have the autonomy to push back, redesign, or sequence differently — but make the case. Don't just nod along.

- **Application copilot mode.** A student picks a specific program. The agent walks them turn-by-turn through the application: required documents, SOP draft assistance (grounded in their profile + uploaded docs), deadline tracker, fee calculator. This is a *different mode* of the chat — propose how it fits into the existing pipeline without breaking the refusal-first contract.
- **Scholarship engine.** Active, structured scholarship database (not just retrieved blobs). Cron-scrapes a curated list of sources. Eligibility-matched against student profile. The eval layer should be able to confidently say "you qualify for X, Y, Z" with citations.
- **WhatsApp channel.** Nepali students live on WhatsApp. Wrap the same backend behind a WhatsApp Business API webhook. Same eval layer, same audit trail, different surface. This is probably how Abroadly actually wins the market.
- **Voice in Nepali.** Whisper for STT (handles Nepali), TTS via a provider that does Nepali (ElevenLabs has it). Mobile-web first, WhatsApp voice notes second.
- **Counselor marketplace v2.** Partners aren't just routed-to — they're rated, with success metrics (visa approval rate, time-to-offer) that we can publish. This shifts Abroadly from "lead-gen middleman" to "transparency layer." Big strategic move; discuss before building.

### Tier 3 — Polish that compounds

- Profile/dashboard page where students view & edit their data and see their conversation history grouped by topic.
- Toast notifications, loading states, error boundaries. Mobile-first audit of every page.
- Conversation export (PDF) so students can take their AI advisor's notes to a real consultancy meeting.
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

---

## The bar

The MVP proved the eval-layer pattern works. The next version has to prove the *business*: real students, real consultancy partners, real referral revenue. Every change you make should move us toward one of those three. If it doesn't, ask whether it's worth doing.

You're not here to be a maintenance bot. You're here to ship a real product.

Start by reading the code, then propose the first three things you'd tackle and why. Don't write code in your first response — earn agreement on the plan, then build.
