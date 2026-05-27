"""Seed Chroma with global knowledge documents.

Usage (from backend/ directory):
    python scripts/seed_knowledge.py              # reads from ./seed_data (default)
    python scripts/seed_knowledge.py <dir>        # reads from <dir>

Reads all .txt and .pdf files from the given directory (defaults to ./seed_data
under backend/, falls back to settings.upload_dir if seed_data doesn't exist).
Chunks into ~400-token segments (~300 words) with 50-token overlap (~40 words).
Embeds with Gemini and writes to Chroma with kind=global metadata.
"""
from __future__ import annotations

import sys
import uuid
from pathlib import Path

# Make sure `app` is importable when run from backend/
sys.path.insert(0, str(Path(__file__).parent.parent))

import google.generativeai as genai

from app.core.config import settings
from app.core.db import get_chroma

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CHUNK_WORDS = 300       # ~400 tokens
OVERLAP_WORDS = 40      # ~50 tokens
EMBEDDING_MODEL = "models/gemini-embedding-001"
BATCH_SIZE = 50         # Chroma upsert batch size


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------
def extract_txt(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def extract_pdf(path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n".join(pages)


def extract_text(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        return extract_pdf(path)
    return extract_txt(path)


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------
def chunk_text(text: str, chunk_words: int = CHUNK_WORDS, overlap: int = OVERLAP_WORDS) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = start + chunk_words
        chunks.append(" ".join(words[start:end]))
        start += chunk_words - overlap
    return chunks


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------
def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts. Falls back to one-by-one on batch failure."""
    genai.configure(api_key=settings.gemini_api_key)
    embeddings: list[list[float]] = []
    for text in texts:
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_document",
        )
        embeddings.append(result["embedding"])
    return embeddings


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def _resolve_source_dir(override: Path | None) -> Path:
    if override is not None:
        return override
    seed_dir = Path(__file__).parent.parent / "seed_data"
    if seed_dir.exists():
        return seed_dir
    return Path(settings.upload_dir)


def seed(source_dir: Path | None = None) -> None:
    src = _resolve_source_dir(source_dir)
    if not src.exists():
        print(f"Source dir not found: {src}")
        sys.exit(1)

    files = list(src.glob("*.txt")) + list(src.glob("*.pdf"))
    if not files:
        print(f"No .txt or .pdf files found in {src}")
        sys.exit(0)

    print(f"Reading seed files from: {src}")

    collection = get_chroma()

    for file_path in files:
        print(f"\n--- Processing: {file_path.name} ---")
        try:
            text = extract_text(file_path)
        except Exception as exc:
            print(f"  [SKIP] Failed to read {file_path.name}: {exc}")
            continue

        if not text.strip():
            print(f"  [SKIP] Empty text in {file_path.name}")
            continue

        chunks = chunk_text(text)
        print(f"  {len(chunks)} chunks")

        # Upsert in batches
        for batch_start in range(0, len(chunks), BATCH_SIZE):
            batch_texts = chunks[batch_start : batch_start + BATCH_SIZE]
            batch_ids = [str(uuid.uuid4()) for _ in batch_texts]
            batch_meta = [
                {
                    "kind": "global",
                    "title": file_path.name,
                    "source_type": "global",
                    "file": str(file_path),
                    "chunk_index": batch_start + i,
                }
                for i, _ in enumerate(batch_texts)
            ]

            print(f"  Embedding batch {batch_start // BATCH_SIZE + 1} "
                  f"({len(batch_texts)} chunks)...", end=" ", flush=True)
            try:
                embeddings = embed_batch(batch_texts)
            except Exception as exc:
                print(f"FAILED: {exc}")
                continue

            collection.upsert(
                ids=batch_ids,
                documents=batch_texts,
                embeddings=embeddings,
                metadatas=batch_meta,
            )
            print(f"done")

        print(f"  [{file_path.name}] seeded {len(chunks)} chunks into Chroma.")

    total = collection.count()
    print(f"\nDone. Chroma collection '{settings.chroma_collection}' now has {total} chunks.")


if __name__ == "__main__":
    override = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    seed(override)
