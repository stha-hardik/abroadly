"""Shared normalizer types — kept in their own file so api/, normalizer/, and
tests can all import without cycles."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class NormalizationResult:
    """The output of a single normalize() call.

    `original`     — exactly what the student typed (preserve for audit + user-turn store).
    `normalized`   — clean English version used downstream (retrieve / eval / generate).
                     Equal to `original` when the input was already English
                     OR when the LLM normalizer was unavailable / errored.
    `was_changed`  — True iff `original != normalized`. Cheap signal for audit / metrics.
    `source`       — Where the normalized version came from. One of:
                     "llm"      — model-translated
                     "cache"    — served from in-process LRU
                     "fallback" — model unavailable; passed through original
    """

    original: str
    normalized: str
    was_changed: bool
    source: str
