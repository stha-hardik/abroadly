"""Grounding score — does retrieved evidence actually cover the query?

v1: cheap token-overlap heuristic between query terms and concatenated top-K docs.
v2: cross-encoder re-rank or NLI model.
"""
import re

_TOKEN_RE = re.compile(r"[a-zA-Z][a-zA-Z0-9\-]{2,}")
_STOP = {
    "the", "and", "for", "with", "that", "this", "what", "how", "are", "can",
    "you", "your", "from", "have", "should", "would", "could", "about", "into",
    "any", "all", "but", "not", "get", "got", "want", "need",
}


def _tokens(text: str) -> set[str]:
    return {t.lower() for t in _TOKEN_RE.findall(text) if t.lower() not in _STOP}


def grounding_score(query: str, chunks: list) -> float:
    """Return 0..1: fraction of query content tokens present in the chunk set.

    Accepts list[RetrievedChunk] — uses .text attribute.
    Swap point for cross-encoder in v2 (same signature, richer impl).
    """
    q = _tokens(query)
    if not q:
        return 0.0
    bag: set[str] = set()
    for c in chunks:
        bag |= _tokens(c.text)
    if not bag:
        return 0.0
    return len(q & bag) / len(q)
