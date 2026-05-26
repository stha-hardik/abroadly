"""Chroma retrieval — student-scoped + global knowledge.

Two filtered queries merged and sorted by score:
  - kind=global   top k=5
  - kind=student  top k=3  (filtered by student_id)

L2 distance normalised: score = 1.0 / (1.0 + distance)
"""
from __future__ import annotations

import google.generativeai as genai

from app.core.config import settings
from app.core.db import get_chroma
from app.eval.types import RetrievedChunk, RetrievedSet

_EMBEDDING_MODEL = "models/gemini-embedding-001"


def _embed(text: str, task_type: str = "retrieval_query") -> list[float]:
    genai.configure(api_key=settings.gemini_api_key)
    result = genai.embed_content(
        model=_EMBEDDING_MODEL,
        content=text,
        task_type=task_type,
    )
    return result["embedding"]


def _parse_results(
    results: dict,
    source_type: str,
) -> list[RetrievedChunk]:
    """Convert a Chroma query result dict into RetrievedChunk objects."""
    chunks: list[RetrievedChunk] = []
    ids = results.get("ids", [[]])[0]
    docs = results.get("documents", [[]])[0]
    dists = results.get("distances", [[]])[0]
    metas = results.get("metadatas", [[]])[0]

    for doc_id, document, distance, meta in zip(ids, docs, dists, metas):
        score = 1.0 / (1.0 + distance)
        chunks.append(
            RetrievedChunk(
                id=doc_id,
                text=document,
                score=score,
                source_type=meta.get("source_type", source_type),
                metadata=meta or {},
            )
        )
    return chunks


async def retrieve(query: str, student_id: str, k: int = 5) -> RetrievedSet:
    """Search Chroma. Merge global knowledge + this student's uploaded docs."""
    try:
        q_emb = _embed(query, task_type="retrieval_query")
    except Exception:
        return RetrievedSet(chunks=[])

    collection = get_chroma()
    total_docs = collection.count()

    if total_docs == 0:
        return RetrievedSet(chunks=[])

    chunks: list[RetrievedChunk] = []

    # --- Global knowledge ---------------------------------------------------
    global_k = min(5, total_docs)
    try:
        global_results = collection.query(
            query_embeddings=[q_emb],
            n_results=global_k,
            where={"kind": {"$eq": "global"}},
            include=["documents", "metadatas", "distances"],
        )
        chunks.extend(_parse_results(global_results, "global"))
    except Exception:
        pass

    # --- Student-specific docs ----------------------------------------------
    student_k = min(3, total_docs)
    try:
        student_results = collection.query(
            query_embeddings=[q_emb],
            n_results=student_k,
            where={"$and": [{"kind": {"$eq": "student"}}, {"student_id": {"$eq": student_id}}]},
            include=["documents", "metadatas", "distances"],
        )
        chunks.extend(_parse_results(student_results, "student"))
    except Exception:
        pass

    # Merge, deduplicate by id, sort by score descending, return top 6
    seen: set[str] = set()
    merged: list[RetrievedChunk] = []
    for c in sorted(chunks, key=lambda x: x.score, reverse=True):
        if c.id not in seen:
            seen.add(c.id)
            merged.append(c)

    return RetrievedSet(chunks=merged[:6])
