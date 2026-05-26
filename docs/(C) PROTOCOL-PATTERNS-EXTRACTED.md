# Protocol v3 patterns lifted into Abroadly

Source: `D:\Protocol\projects\project 2.0\` (Flask + RAG, deprioritized).

## What we kept

| Protocol pattern                                                            | Abroadly adaptation                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Chroma collection + metadata filter for tenant isolation (`workspace_id`)   | Same idea, key renamed to `student_id` for per-student docs + `kind=global` for seed |
| Gemini embeddings (`models/gemini-embedding-001`)                           | Same. Cheap, decent quality.                                                         |
| Groq llama-3.3-70b primary, Gemini fallback in `_generate()`                | Same two-tier fallback in `app/rag/generator.py`                                     |
| Chunking via `RecursiveCharacterTextSplitter` (1000 / 200)                  | Same defaults — proven for prose-style docs                                          |
| Postgres for relational metadata alongside Chroma vectors                   | Same split: PG for students/turns/uploads, Chroma for embeddings                     |
| Env loading via `python-dotenv` + `CHROMA_DIR`, `GROQ_API_KEY`, `GEMINI_*`  | Same env shape, see `.env.example`                                                   |
| PDF text extraction via PyPDF2                                              | Kept for PDFs in `rag/ocr.py`. Added pytesseract for images.                         |

## What we changed and why

| Change                                                              | Why                                                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Flask -> FastAPI                                                    | Async-first, auto OpenAPI (typed contract for Precious), better for IO-bound LLM calls      |
| Sync `psycopg2` -> async SQLAlchemy + `asyncpg`                     | Match FastAPI's async story                                                                 |
| Generation inlined with retrieval                                   | Split into `retriever` + `evaluator` + `generator` so the eval layer can veto generation    |
| No eval/scope check in Protocol                                     | Eval layer is the killer feature here — refusal-first, not generation-first                 |
| `workspace_id` mandatory tenant key                                 | Replaced by `student_id` for uploads; global knowledge lives under `kind=global` (no tenant)|
| Connectors framework (Google Drive, REST, Supabase, webhook)        | Dropped at MVP. Abroadly's ingest is direct upload + seeded knowledge only.                 |
| Auth (`tools/auth.py`)                                              | Deferred. MVP is open; add JWT or session when consultancies enter the system.              |

## What we did NOT bring across

- LangChain wrappers everywhere. We use `chromadb` directly for retrieval; LangChain only if we genuinely need its glue.
- The Protocol "department" categorization. Abroadly's knowledge is flat at MVP — country / topic tags via simple metadata, no taxonomy module.
- `seed_demo.py` shape — Abroadly will have its own seed script tailored to study-abroad sample docs.

## Open carry-overs to revisit

- Cross-encoder re-ranking — Protocol skipped it; eval layer's `confidence.py` is where we'd add it for Abroadly.
- Workspace-level rate limits — Abroadly should add per-IP and per-student limits before public launch.
