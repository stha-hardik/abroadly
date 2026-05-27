# AGENTS.md

Read this before touching the repo. It applies to **every AI collaborator** — Codex, Claude, Cursor, Aider, anything else. For deeper product context, read `PROMPT_FOR_CLAUDE_MAX.md` after this file.

---

## Mission

Abroadly is **free, opensource student support** for people from Nepal (and South Asia) who want to study abroad. Many students pay consultancies large fees for advice they could get for free. Abroadly is the alternative — a grounded AI that:

- Answers honestly from a curated knowledge base
- Refuses to guess when it doesn't know
- Points students at **official sources** (universities, embassies, IRCC / DHA / UCAS / Common App / Education USA / DAAD), **never at a consultancy**
- Lives at http://abroadly.online, MIT-licensed

**We are not a referral funnel. We are the alternative to one.** Any framing in old docs, prompts, or templates that recommends "talking to a consultancy" is from the previous business model and must be replaced when found.

---

## The deploy contract (load-bearing — do not break)

**Push to `main` = live site updates.** GitHub Actions (`.github/workflows/deploy.yml`) SSHes to the Hostinger VPS, runs `./deploy.sh`, and smoke-tests the live URL. There is no separate "staging."

Consequences for you:

1. **Never push directly to `main`.** Open a PR. Get a human review. Merge to deploy. If you're driving a fully-trusted session, you may merge once tests pass — but assume a human is watching.
2. **Never edit `.github/workflows/deploy.yml`, `deploy.sh`, `infra/setup-vps.sh`, or `infra/systemd/*` without explicit human approval in the same conversation.** These are the deploy substrate. Break them and the whole site stops updating.
3. **A red CI = a red site, eventually.** If the workflow fails, do not "fix forward" by merging again. Investigate the failure first — it's almost always SSH config, secrets, or a runtime error on the VPS.
4. **Health checks in the workflow are non-negotiable.** Do not remove or weaken the smoke test in `deploy.yml`. If it's flaky, fix the flake; don't delete the check.
5. **Secrets live in GitHub Secrets and the Hostinger MCP config, never in the repo.** If you see a credential in a diff, stop and tell the user.

---

## How the deploy pipeline works

```
You edit code locally
      │
      ▼
  git commit → PR → merge to main
      │
      ▼
  GitHub Action: .github/workflows/deploy.yml
      │
      ├── ssh deploy-key@<VPS_HOST>:<VPS_PORT> 'cd <DEPLOY_PATH> && ./deploy.sh'
      │     ↑
      │     pubkey provisioned via Hostinger MCP (VPS_attachPublicKeyV1)
      │     private key in repo secret VPS_SSH_KEY
      │
      ├── smoke-test: curl http://abroadly.online and :8000/health, both must 200
      │
      ▼
  abroadly.online updated
```

Source of truth for the deploy story: [infra/DEPLOY.md](infra/DEPLOY.md). Update that file when the flow changes.

---

## Repo invariants (architecture rules — see also `docs/(C) ARCHITECTURE.md`)

These are not aspirations. They are enforced by the design.

1. **Refusal-first.** The eval layer in `backend/app/eval/` runs **before** generation. Never lower thresholds to make the model talk more. If quality is bad, fix retrieval or the knowledge base.
   - Exception: the **partial-answer** mode (eval returns LOW_CONFIDENCE with `debug.partial_answer = True`) where retrieval is thin but in-scope. The generator still runs but in a gap-honest mode that points at official sources. This is not "loosening refusal" — it's giving the student the part we know plus a verifiable next step, instead of a bare clarifier.
2. **Pipeline stays clean:** `normalize → retrieve → rerank → eval → generate`. Each step is a swappable module. Do not merge concerns into `backend/app/api/chat.py`.
3. **Provider abstraction:** Groq/Gemini SDK imports live ONLY in `backend/app/rag/llm.py`. Importing them anywhere else is a bug, full stop.
4. **Per-student isolation via Chroma metadata** (`student_id` filter), not separate collections.
5. **Async-first.** No sync IO on the request path.
6. **Audit everything.** Every chat turn writes scores, decisions, and chunk IDs to `chat_audit`. Don't skip this for "performance."
7. **No consultancy framing.** Refusal templates, escalate messages, and the system prompt all point at the official authority (doctor / lawyer / financial advisor / embassy / IRCC / DHA / UCAS / Common App / Education USA / DAAD / etc.) — never at a consultancy.

---

## What lives where

| Path                                | Purpose                                                  |
| ----------------------------------- | -------------------------------------------------------- |
| `backend/app/api/`                  | FastAPI routers — thin, no business logic                |
| `backend/app/eval/`                 | The killer feature; pure-function eval layer             |
| `backend/app/rag/`                  | Retrieval, reranking, generation, OCR, LLM abstraction   |
| `backend/app/rag/llm.py`            | **Only** file that imports Groq/Gemini SDKs              |
| `backend/app/models/`               | SQLAlchemy ORM + pydantic schemas (Student, ChatTurn)    |
| `backend/app/prompts/system_prompt.md` | The student-direct system prompt — citation-mandatory  |
| `backend/scripts/seed_knowledge.py` | KB seeder — currently a stub, real seed is Tier-0 work   |
| `backend/tests/`                    | Pytest. Add to it when you change `eval/` or `rag/`.     |
| `frontend/src/app/`                 | Next.js App Router pages: `/`, `/onboarding`, `/chat`    |
| `frontend/src/lib/api.ts`           | Hand-written typed API client (will be OpenAPI-gen'd later) |
| `docs/(C) *.md`                     | Architecture / eval-layer spec / roadmap. Read these.    |
| `infra/`                            | VPS setup, systemd, nginx, deploy guide                  |
| `.github/workflows/deploy.yml`      | The auto-deploy workflow                                 |
| `LICENSE`                           | MIT                                                      |

---

## Working principles for AI collaborators

- **Read before you write.** Especially `docs/(C) ARCHITECTURE.md` and `docs/(C) EVAL-LAYER-SPEC.md`. The decisions have reasons.
- **One change, one commit, clear message.** No "wip" or "stuff." Reference the tier/feature from `PROMPT_FOR_CLAUDE_MAX.md` when relevant.
- **Test before pushing.** Backend has `tests/` — add to it. Frontend changes: actually load the page and try the flow.
- **Earn agreement on plan before building large features.** Propose first.
- **Don't invent files.** No README updates, decision logs, or `ARCHITECTURE_V2.md` unless asked. Code and commits are the artifacts.
- **Push back when you should.** If you think a feature is wrong, say so before building it.
- **Be honest about capability gaps.** If you can't reach the VPS, say so. If an MCP isn't loaded, say so. Don't pretend.
- **If you encounter old consultancy-referral framing**, replace it. Update the prompt, the policy template, the README — wherever you see it. It's a bug.

---

## Quick links

- Live site: http://abroadly.online
- Repo: https://github.com/stha-hardik/abroadly
- VPS: AlmaLinux 9 on Hostinger, IP `187.124.27.168`
- Deploy guide: `infra/DEPLOY.md`
- Product/strategic briefing: `PROMPT_FOR_CLAUDE_MAX.md`
- Architecture: `docs/(C) ARCHITECTURE.md`
- The killer feature: `docs/(C) EVAL-LAYER-SPEC.md`
- Roadmap: `docs/(C) ROADMAP.md`
- License: `LICENSE` (MIT)
