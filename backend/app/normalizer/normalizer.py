"""The Normalizer — pure function from raw student query to clean English.

Sits BEFORE retrieve in the chat pipeline. The default implementation
delegates to the LLM provider's `normalize()` method (vendor SDK isolation:
all Groq/Gemini imports live in app.rag.llm).

Failure mode: any exception falls through with `original` unchanged. A
normalizer hiccup must never break a chat request — we'd rather miss the
translation than serve a 500.
"""
from __future__ import annotations

from pathlib import Path
from typing import Protocol

from app.normalizer.cache import cache
from app.normalizer.types import NormalizationResult
from app.rag.llm import default_llm

_PROMPT_PATH = Path(__file__).parent / "prompt.md"


def _load_system_prompt() -> str:
    try:
        return _PROMPT_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        # Minimal inline fallback so chat keeps working if the file is missing
        return (
            "Translate Nepali- or Hindi-romanized study-abroad questions to "
            "clean English. If already English, return unchanged. Output the "
            "translation only, no quotes."
        )


class Normalizer(Protocol):
    async def normalize(self, query: str) -> NormalizationResult: ...


class LLMNormalizer:
    """Default normalizer — Gemini Flash via the rag.llm provider abstraction."""

    def __init__(self) -> None:
        self._system_prompt = _load_system_prompt()

    async def normalize(self, query: str) -> NormalizationResult:
        original = query.strip()
        if not original:
            return NormalizationResult(original=query, normalized=query, was_changed=False, source="fallback")

        # Cache hit — skip the LLM call entirely
        cached = cache.get(original)
        if cached is not None:
            return NormalizationResult(
                original=original,
                normalized=cached,
                was_changed=(cached != original),
                source="cache",
            )

        try:
            normalized_raw = await default_llm.normalize(
                system=self._system_prompt,
                query=original,
            )
        except Exception:
            # Don't block the request on a normalizer hiccup
            return NormalizationResult(
                original=original,
                normalized=original,
                was_changed=False,
                source="fallback",
            )

        normalized = _clean_llm_output(normalized_raw, fallback=original)
        cache.set(original, normalized)
        return NormalizationResult(
            original=original,
            normalized=normalized,
            was_changed=(normalized != original),
            source="llm",
        )


def _clean_llm_output(raw: str, fallback: str) -> str:
    """Strip common LLM noise (quotes, "Translation:" prefix, surrounding whitespace).
    If cleaning yields an empty string, return the original — never block on a
    bad model response.
    """
    if not raw:
        return fallback
    s = raw.strip()
    # Strip leading "Output:" / "Translation:" labels the model sometimes adds
    for prefix in ("Output:", "Translation:", "English:"):
        if s.lower().startswith(prefix.lower()):
            s = s[len(prefix) :].strip()
    # Strip a single pair of wrapping quotes
    if len(s) >= 2 and s[0] in {'"', "'"} and s[-1] == s[0]:
        s = s[1:-1].strip()
    return s or fallback


# Process-wide singleton — chat.py imports this directly.
default_normalizer: Normalizer = LLMNormalizer()
