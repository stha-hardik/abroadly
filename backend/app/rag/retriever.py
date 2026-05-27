"""Chroma retrieval — student-scoped + global knowledge.

Vector queries and local BM25 lexical ranking merged and sorted by score:
  - kind=global   top k=5
  - kind=student  top k=3  (filtered by student_id)

L2 distance normalised: score = 1.0 / (1.0 + distance)
BM25 scores normalised into a conservative 0..1 band.
"""
from __future__ import annotations

import re

import google.generativeai as genai
from rank_bm25 import BM25Okapi

from app.core.config import settings
from app.core.db import get_chroma
from app.eval.types import RetrievedChunk, RetrievedSet

_EMBEDDING_MODEL = "models/gemini-embedding-001"
_TOKEN_RE = re.compile(r"[\w']+", re.UNICODE)
_BM25_DOC_LIMIT = 750
_BM25_SCORE_FLOOR = 0.35
_BM25_SCORE_CEILING = 0.85


def _embed(text: str, task_type: str = "retrieval_query") -> list[float]:
    genai.configure(api_key=settings.gemini_api_key)
    result = genai.embed_content(
        model=_EMBEDDING_MODEL,
        content=text,
        task_type=task_type,
    )
    return result["embedding"]


def _tokenize(text: str) -> list[str]:
    """Unicode-aware tokenizer for BM25.

    This is intentionally light: it supports English and Nepali-ish word tokens
    without adding another NLP dependency or stemming language-specific words.
    """
    return [token for token in _TOKEN_RE.findall(text.lower()) if token.strip()]


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


def _parse_get_results(results: dict, source_type: str) -> list[RetrievedChunk]:
    """Convert a Chroma get() result dict into zero-scored chunks for BM25."""
    chunks: list[RetrievedChunk] = []
    ids = results.get("ids", [])
    docs = results.get("documents", [])
    metas = results.get("metadatas", [])

    for doc_id, document, meta in zip(ids, docs, metas):
        if not document:
            continue
        metadata = dict(meta or {})
        chunks.append(
            RetrievedChunk(
                id=doc_id,
                text=document,
                score=0.0,
                source_type=metadata.get("source_type", source_type),
                metadata=metadata,
            )
        )
    return chunks


def _bm25_search(collection, query: str, student_id: str, k: int) -> list[RetrievedChunk]:
    """Local lexical fallback/rerank over the Chroma documents.

    This keeps chat useful when dense retrieval is unavailable and helps exact
    phrases like "CAS", "CoE", "IELTS", or "GTE" bubble up.
    """
    query_tokens = _tokenize(query)
    if not query_tokens:
        return []

    candidates: list[RetrievedChunk] = []
    filters = [
        ({"kind": {"$eq": "global"}}, "global"),
        ({"$and": [{"kind": {"$eq": "student"}}, {"student_id": {"$eq": student_id}}]}, "student"),
    ]
    for where, source_type in filters:
        try:
            results = collection.get(
                where=where,
                include=["documents", "metadatas"],
                limit=_BM25_DOC_LIMIT,
            )
        except Exception:
            continue
        candidates.extend(_parse_get_results(results, source_type))

    if not candidates:
        return []

    tokenized_corpus = [_tokenize(chunk.text) for chunk in candidates]
    if not any(tokenized_corpus):
        return []

    bm25 = BM25Okapi(tokenized_corpus)
    raw_scores = bm25.get_scores(query_tokens)
    positive = [(idx, float(score)) for idx, score in enumerate(raw_scores) if float(score) > 0]
    if not positive:
        return []

    max_score = max(score for _, score in positive)
    ranked: list[RetrievedChunk] = []
    for idx, raw_score in sorted(positive, key=lambda item: item[1], reverse=True)[:k]:
        base = candidates[idx]
        metadata = dict(base.metadata)
        metadata["retrieval_method"] = "bm25"
        normalized = _BM25_SCORE_FLOOR
        if max_score > 0:
            normalized += (_BM25_SCORE_CEILING - _BM25_SCORE_FLOOR) * (raw_score / max_score)
        ranked.append(
            RetrievedChunk(
                id=base.id,
                text=base.text,
                score=round(min(normalized, _BM25_SCORE_CEILING), 4),
                source_type=base.source_type,
                metadata=metadata,
            )
        )
    return ranked


def _merge_chunks(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
    """Deduplicate by id, keeping the highest-scored copy."""
    best: dict[str, RetrievedChunk] = {}
    for chunk in chunks:
        current = best.get(chunk.id)
        if current is None or chunk.score > current.score:
            best[chunk.id] = chunk
    return sorted(best.values(), key=lambda x: x.score, reverse=True)


async def retrieve(query: str, student_id: str, k: int = 5) -> RetrievedSet:
    """Search Chroma. Merge global knowledge + this student's uploaded docs."""
    collection = get_chroma()
    total_docs = collection.count()

    if total_docs == 0:
        return RetrievedSet(chunks=[])

    bm25_chunks = _bm25_search(collection, query, student_id, k=max(k, 6))

    try:
        q_emb = _embed(query, task_type="retrieval_query")
    except Exception:
        return RetrievedSet(chunks=bm25_chunks[:6])

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

    chunks.extend(bm25_chunks)
    merged = _merge_chunks(chunks)

    return RetrievedSet(chunks=merged[:6])
