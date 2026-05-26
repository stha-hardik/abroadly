"""Rerank slot — sits between retriever and eval.

v1: no-op pass-through. Preserves the pipeline slot so a cross-encoder
(Cohere rerank, local ms-marco, etc.) can be plugged in without touching
chat.py or the eval layer.

Pipeline: retrieve -> rerank -> eval -> generate
"""
from __future__ import annotations

from app.eval.types import RetrievedSet


async def rerank(query: str, retrieved: RetrievedSet) -> RetrievedSet:
    """v1: identity. v2: cross-encoder re-scores + re-sorts chunks."""
    _ = query  # query available for cross-encoder in v2
    return retrieved
