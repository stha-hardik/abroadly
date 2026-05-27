"""Seed Chroma with global knowledge documents.

Usage (from backend/ directory):
    python scripts/seed_knowledge.py                  # default: ./seed_data
    python scripts/seed_knowledge.py <dir>            # explicit source dir
    python scripts/seed_knowledge.py --dry-run        # parse + chunk, no embeds/writes
    python scripts/seed_knowledge.py --country uk     # only seed the uk/ subdir
    python scripts/seed_knowledge.py --reset          # wipe kind=global chunks first
    python scripts/seed_knowledge.py --reset --country uk   # wipe only uk/, then seed

Source layout supported:

    seed_data/
    ├── uk/                       (per-country folder — preferred)
    │   ├── 01-overview.md
    │   ├── 02-universities.md
    │   └── …
    ├── canada/
    │   └── …
    ├── australia-study-after-12.txt   (legacy top-level file — still works)
    └── uk-study-after-12.txt          (legacy top-level file — still works)

Per-country .md files are chunked at heading boundaries (## H2 by default)
with a max chunk size of CHUNK_CHARS chars and OVERLAP_CHARS overlap. Each
chunk gets metadata: {kind, country, topic, source_file, chunk_index}.

Legacy top-level .txt / .pdf files fall back to word-based chunking and get
country/topic inferred from filename (e.g. "uk-study-after-12.txt" → country=uk,
topic=study-after-12).

Idempotency: chunk IDs are deterministic — sha256(source_file + chunk_index).
Re-running the script upserts in place, so the Chroma collection stays clean
across multiple runs of the same corpus. Use --reset to fully clear first.
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

# Make sure `app` is importable when run from backend/
sys.path.insert(0, str(Path(__file__).parent.parent))

import google.generativeai as genai  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.db import get_chroma  # noqa: E402

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CHUNK_CHARS = 1500          # ~250–400 tokens; comfortably under any embed limit
OVERLAP_CHARS = 200         # carry context across chunk boundaries
LEGACY_CHUNK_WORDS = 300    # for plain .txt/.pdf — kept compatible with old seeds
LEGACY_OVERLAP_WORDS = 40
EMBEDDING_MODEL = "models/gemini-embedding-001"
BATCH_SIZE = 32             # Chroma upsert + embedding batch size
HEADING_SPLIT = re.compile(r"^(#{2,3})\s+(.+)$", re.MULTILINE)

# Files to skip — docs/README for humans, not knowledge content for students.
SKIP_FILENAMES = {"readme.md", "readme.txt", ".ds_store"}


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------
def extract_text(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        return "\n".join((p.extract_text() or "") for p in reader.pages)
    return path.read_text(encoding="utf-8", errors="replace")


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------
def _split_long_block(block: str, max_chars: int = CHUNK_CHARS, overlap: int = OVERLAP_CHARS) -> list[str]:
    """Character-window split for any block already shorter than max_chars*2."""
    if len(block) <= max_chars:
        return [block]
    out: list[str] = []
    start = 0
    while start < len(block):
        end = start + max_chars
        out.append(block[start:end])
        start += max(1, max_chars - overlap)
    return out


def chunk_markdown(text: str) -> list[str]:
    """Split at H2/H3 headings, then character-window oversize blocks.

    Each chunk retains its parent heading so the embedding stays topical.
    """
    matches = list(HEADING_SPLIT.finditer(text))
    if not matches:
        return _split_long_block(text)

    chunks: list[str] = []
    # Anything before the first heading (e.g. an H1 + intro paragraph).
    preamble = text[: matches[0].start()].strip()
    if preamble:
        chunks.extend(_split_long_block(preamble))

    for i, m in enumerate(matches):
        section_start = m.start()
        section_end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        section = text[section_start:section_end].strip()
        if not section:
            continue
        chunks.extend(_split_long_block(section))

    # Drop pathological empties.
    return [c for c in chunks if c.strip()]


def chunk_legacy_text(text: str) -> list[str]:
    """Word-window chunker matching the old behaviour, for plain .txt/.pdf inputs."""
    words = text.split()
    if not words:
        return []
    out: list[str] = []
    start = 0
    step = LEGACY_CHUNK_WORDS - LEGACY_OVERLAP_WORDS
    while start < len(words):
        out.append(" ".join(words[start : start + LEGACY_CHUNK_WORDS]))
        start += step
    return out


# ---------------------------------------------------------------------------
# Metadata
# ---------------------------------------------------------------------------
def infer_country_topic(file_path: Path, source_root: Path) -> tuple[str, str]:
    """Country = first sub-directory under source_root; topic = filename stem.

    Legacy top-level files (e.g. uk-study-after-12.txt) use first dash-segment
    as country, rest as topic.
    """
    try:
        rel = file_path.relative_to(source_root)
    except ValueError:
        rel = Path(file_path.name)

    parts = rel.parts
    if len(parts) >= 2:
        country = parts[0].lower()
        topic = file_path.stem
    else:
        stem = file_path.stem.lower()
        if "-" in stem:
            head, _, tail = stem.partition("-")
            country, topic = head, tail
        else:
            country, topic = "unknown", stem
    return country, topic


def stable_chunk_id(source_file: str, chunk_index: int) -> str:
    h = hashlib.sha256(f"{source_file}::{chunk_index}".encode("utf-8")).hexdigest()
    return f"chunk_{h[:24]}"


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------
def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts one at a time (Gemini API is per-doc here)."""
    genai.configure(api_key=settings.gemini_api_key)
    out: list[list[float]] = []
    for text in texts:
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_document",
        )
        out.append(result["embedding"])
    return out


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


def _collect_files(root: Path, country_filter: str | None) -> list[Path]:
    """All .md / .txt / .pdf files under root, optionally restricted to one country dir."""
    if country_filter:
        sub = root / country_filter.lower()
        if not sub.exists() or not sub.is_dir():
            print(f"Country filter '{country_filter}' did not match a sub-directory under {root}")
            return []
        candidates = list(sub.rglob("*"))
    else:
        candidates = list(root.rglob("*"))
    files = [
        p
        for p in candidates
        if p.is_file()
        and p.suffix.lower() in {".md", ".txt", ".pdf"}
        and p.name.lower() not in SKIP_FILENAMES
    ]
    files.sort()
    return files


def _reset_collection(country_filter: str | None) -> None:
    """Delete kind=global chunks (optionally only for one country)."""
    collection = get_chroma()
    where: dict = {"kind": "global"}
    if country_filter:
        where = {"$and": [{"kind": "global"}, {"country": country_filter.lower()}]}
    print(f"Resetting Chroma chunks matching: {where}")
    collection.delete(where=where)


def seed(source_dir: Path | None = None, country_filter: str | None = None, dry_run: bool = False, reset: bool = False) -> None:
    src = _resolve_source_dir(source_dir)
    if not src.exists():
        print(f"Source dir not found: {src}")
        sys.exit(1)

    if reset and not dry_run:
        _reset_collection(country_filter)

    files = _collect_files(src, country_filter)
    if not files:
        print(f"No .md / .txt / .pdf files found in {src} (country filter: {country_filter or 'none'})")
        sys.exit(0)

    print(f"Reading from: {src}")
    print(f"Files: {len(files)}{' (DRY RUN)' if dry_run else ''}")

    collection = None if dry_run else get_chroma()
    total_chunks = 0

    for file_path in files:
        country, topic = infer_country_topic(file_path, src)
        print(f"\n--- [{country}/{topic}] {file_path.name} ---")
        try:
            text = extract_text(file_path)
        except Exception as exc:
            print(f"  SKIP — extract failed: {exc}")
            continue
        if not text.strip():
            print(f"  SKIP — empty text")
            continue

        if file_path.suffix.lower() == ".md":
            chunks = chunk_markdown(text)
        else:
            chunks = chunk_legacy_text(text)

        print(f"  {len(chunks)} chunks")
        total_chunks += len(chunks)

        if dry_run:
            for i, c in enumerate(chunks[:2]):
                preview = c.replace("\n", " ")[:140]
                print(f"    [{i}] {preview}…")
            continue

        # Upsert in batches
        rel_source = str(file_path.relative_to(src))
        for batch_start in range(0, len(chunks), BATCH_SIZE):
            batch_texts = chunks[batch_start : batch_start + BATCH_SIZE]
            batch_ids = [stable_chunk_id(rel_source, batch_start + i) for i, _ in enumerate(batch_texts)]
            batch_meta = [
                {
                    "kind": "global",
                    "country": country,
                    "topic": topic,
                    "source_file": rel_source,
                    "title": file_path.name,
                    "source_type": "global",
                    "chunk_index": batch_start + i,
                }
                for i, _ in enumerate(batch_texts)
            ]

            print(f"  Embedding batch {batch_start // BATCH_SIZE + 1} ({len(batch_texts)} chunks)...", end=" ", flush=True)
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
            print("done")

        print(f"  Seeded {len(chunks)} chunks for {rel_source}.")

    if dry_run:
        print(f"\nDRY RUN — would have seeded {total_chunks} chunks across {len(files)} files.")
        return

    final_count = collection.count() if collection is not None else "?"
    print(f"\nDone. Chroma collection '{settings.chroma_collection}' now has {final_count} chunks total.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Chroma with Abroadly global knowledge.")
    parser.add_argument("source_dir", nargs="?", type=Path, default=None, help="Source root (defaults to backend/seed_data)")
    parser.add_argument("--country", help="Only seed files under this country sub-directory (e.g. uk, canada)")
    parser.add_argument("--dry-run", action="store_true", help="Parse and chunk only, no embeds or writes")
    parser.add_argument("--reset", action="store_true", help="Delete kind=global (optionally filtered by --country) before seeding")
    args = parser.parse_args()

    seed(
        source_dir=args.source_dir,
        country_filter=args.country,
        dry_run=args.dry_run,
        reset=args.reset,
    )


if __name__ == "__main__":
    main()
