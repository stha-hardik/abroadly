# Abroadly Architecture

## System shape

```
                 +--------------------+
   Browser  -->  |  Next.js frontend  |
                 |  /, /onboarding,   |
                 |  /chat             |
                 +---------+----------+
                           | HTTPS (typed via OpenAPI)
                           v
                 +--------------------+
                 |   FastAPI backend  |
                 |   app/main.py      |
                 +----+-----+----+----+
                      |     |    |
        onboarding.py |     |    | upload.py
                      v     v    v
                 +-----+   +---------+   +---------+
                 | PG  |   | EVAL    |<--|  RAG    |
                 |     |   | LAYER   |   | retr+gen|
                 +-----+   +----+----+   +----+----+
                               |              |
                               v              v
                          decision         +-------+   +-------+
                       (answer/refuse/     |Chroma |   | LLMs  |
                        clarify/escalate)  +-------+   | Groq/ |
                                                       | Gemini|
                                                       +-------+
```

## Components

### `app/api/` — HTTP surface
Thin FastAPI routers. No business logic. Validates input (pydantic), delegates, returns typed responses. Drives the auto-generated OpenAPI Precious consumes.

### `app/eval/` — Eval layer (the killer feature)
**Sits between retrieval and generation.** Pure function over `(query, student_ctx, retrieved_docs) -> EvalDecision`. Swappable. See `(C) EVAL-LAYER-SPEC.md`.

### `app/rag/` — Retrieval + generation
- `retriever.py`: Chroma similarity search, metadata-filtered by `student_id` (student-specific docs) + global knowledge collection. Lifted shape from Protocol v3 `tools/retrieve.py`, adapted to async + per-student filtering.
- `generator.py`: Groq llama-3.3-70b primary, Gemini fallback. System prompt loaded from `prompts/system_prompt.md`. Generation ONLY runs if eval layer says `proceed`.
- `ocr.py`: PDF via PyPDF2, image via pytesseract. Returns plain text for chunking.

### `app/core/`
- `config.py`: pydantic-settings, reads `.env`.
- `db.py`: async SQLAlchemy engine + Chroma client. Singletons via FastAPI dependency injection.

### `app/models/`
SQLAlchemy ORM + pydantic schemas. Student is the only first-class entity at MVP. Knowledge units live in Chroma metadata; partners/referrals come in Phase 6.

## Data flow — chat request

```
retrieve -> rerank -> eval -> generate
```

1. `POST /chat {student_id, message, trace_id?}` hits `api/chat.py`
2. Assign `request_id` (always new uuid) + `trace_id` (caller-supplied or generated)
3. Load student profile from PG — TODO Phase 1
4. **(Phase 5 hook — no-op)** `LanguageNormalizer.normalize(message)` -> normalized query
5. `retriever.retrieve(query, student_id)` -> `RetrievedSet { chunks: list[RetrievedChunk] }`
6. `reranker.rerank(query, retrieved)` -> `RetrievedSet` (no-op v1; cross-encoder v2)
7. `evaluator.evaluate(query, student, retrieved)` -> `EvalDecision { decision, confidence, reason, ... }`
8. Branch on decision:
   - `PROCEED` -> `generator.generate_answer(...)` -> return answer + sources
   - `LOW_CONFIDENCE` -> return clarifying question + `clarification_needed: true`
   - `OUT_OF_SCOPE` -> return refusal template
   - `ESCALATE` -> return CTA (Phase 6 attaches matched consultancy partners)
9. Persist audit row to PG — TODO Phase 1 (see Audit section below)

## Data flow — upload

1. `POST /upload` multipart, scoped by `student_id`
2. Save to `UPLOAD_DIR/<student_id>/<uuid>.<ext>`
3. `ocr.extract(path)` -> text
4. Chunk + embed + write to Chroma with `{student_id, doc_id, source_type}` metadata
5. Return `{doc_id, char_count, status}`

## Storage

- **Postgres:** students, chat_turns, uploads_meta, (Phase 6: partners, referrals)
- **Chroma:** two logical namespaces via metadata
  - `kind=global` — seeded study-abroad knowledge
  - `kind=student` — uploaded docs, filtered by `student_id`

## Provider abstraction

All LLM calls go through `app/rag/llm.py`. No Groq or Gemini SDK imports exist outside that file.

```python
class LLMProvider(Protocol):
    async def generate(self, system, context, profile, query) -> str: ...
```

`GroqGeminiLLM` implements this today. Swap to any provider by changing `default_llm` in `llm.py`. `generator.py` and `chat.py` never import vendor SDKs directly.

## Audit metadata

Every chat turn persists an audit row (TODO Phase 1):

| field | source |
|---|---|
| `request_id` | generated per request |
| `trace_id` | caller-supplied or generated |
| `student_id` | from request |
| `chunk_ids` | `[c.id for c in retrieved.chunks]` |
| `retrieval_scores` | `[c.score for c in retrieved.chunks]` |
| `eval_decision` | `EvalDecision.decision` |
| `eval_confidence` | `EvalDecision.confidence` |
| `model_used` | active provider tag |
| `prompt_version` | hash or tag of `system_prompt.md` |

Audit rows enable: eval threshold tuning, hallucination post-mortems, partner conversion analytics (Phase 6).

## Why this shape

- **Eval layer separate, not glued into chat:** so Phase 5 (language norm) and Phase 6 (matching) slot in as new pipeline steps without touching it. Same reason retrieval and generation are split.
- **Async-first FastAPI:** OCR + LLM calls are IO-bound; async + a worker pool beats threadpooled Flask at the scale Abroadly will hit.
- **Postgres for relational, Chroma for semantic:** clean split, mirrors Protocol v3 — proven.
- **Groq primary, Gemini fallback:** Groq is faster and cheaper for llama-3.3-70b; Gemini stays as a safety net + handles long context if needed.
- **Per-student Chroma metadata, not per-student collection:** cheaper, simpler, and the filter pattern is exactly what Protocol v3 uses for `workspace_id`.

## Lifted from Protocol v3

See `(C) PROTOCOL-PATTERNS-EXTRACTED.md` for the diff.
