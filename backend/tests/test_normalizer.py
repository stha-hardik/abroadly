"""Tests for the Phase 5 language normalizer.

Uses a fake LLMProvider that returns canned translations so we don't hit Gemini.
All real chat code calls `default_normalizer.normalize(...)`; here we instantiate
a fresh LLMNormalizer with the singleton swapped to make the boundary tests crisp.
"""
from __future__ import annotations

import asyncio
from unittest.mock import patch

import pytest

from app.normalizer import default_normalizer
from app.normalizer.cache import cache
from app.normalizer.normalizer import LLMNormalizer, _clean_llm_output


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _run(coro):
    # Each call gets its own event loop — Python 3.14 deprecated module-level
    # get_event_loop() in MainThread. asyncio.run() handles loop lifecycle for us.
    return asyncio.run(coro)


# Canned translations used by the patched llm.normalize() in each test.
_CANNED = {
    "ma australia janu cha kasari?": "How do I go to study in Australia?",
    "mero IELTS 5.5 cha, UK paunchu?": "I have IELTS 5.5, which UK university can I get into?",
    "backlog cha bhane apply garna milcha?": "Can I apply if I have backlogs?",
    "chevening ko deadline kahile ho?": "When is the Chevening scholarship deadline?",
    "Australia ma kati paisa lagchha?": "How much money does it cost to study in Australia?",
    # Pure-English passthrough
    "What documents do I need for a UK student visa?": "What documents do I need for a UK student visa?",
    "How much does it cost to study in Canada?": "How much does it cost to study in Canada?",
}


async def _fake_llm_normalize(system: str, query: str) -> str:
    """Drop-in for app.rag.llm.default_llm.normalize — returns canned output."""
    return _CANNED.get(query, query)


@pytest.fixture(autouse=True)
def _reset_cache():
    """Cache leaks across tests would make assertions order-dependent."""
    cache.clear()
    yield
    cache.clear()


# ---------------------------------------------------------------------------
# Core behaviour
# ---------------------------------------------------------------------------
def test_pure_english_passes_through_unchanged():
    with patch("app.normalizer.normalizer.default_llm.normalize", side_effect=_fake_llm_normalize):
        result = _run(default_normalizer.normalize("What documents do I need for a UK student visa?"))
    assert result.normalized == "What documents do I need for a UK student visa?"
    assert result.was_changed is False
    assert result.source == "llm"  # Still went through the model (which echoed)


def test_nepali_romanized_translates():
    with patch("app.normalizer.normalizer.default_llm.normalize", side_effect=_fake_llm_normalize):
        result = _run(default_normalizer.normalize("ma australia janu cha kasari?"))
    assert result.normalized == "How do I go to study in Australia?"
    assert result.was_changed is True
    assert result.source == "llm"


def test_mixed_code_switch_translates():
    with patch("app.normalizer.normalizer.default_llm.normalize", side_effect=_fake_llm_normalize):
        result = _run(default_normalizer.normalize("mero IELTS 5.5 cha, UK paunchu?"))
    assert "IELTS 5.5" in result.normalized  # number preserved
    assert "UK" in result.normalized  # entity preserved
    assert result.was_changed is True


def test_chevening_deadline_query_preserves_named_entity():
    with patch("app.normalizer.normalizer.default_llm.normalize", side_effect=_fake_llm_normalize):
        result = _run(default_normalizer.normalize("chevening ko deadline kahile ho?"))
    assert "Chevening" in result.normalized
    assert result.was_changed is True


# ---------------------------------------------------------------------------
# Caching
# ---------------------------------------------------------------------------
def test_cache_hit_serves_from_cache_without_calling_llm():
    call_count = {"n": 0}

    async def _counting_fake(system: str, query: str) -> str:
        call_count["n"] += 1
        return _CANNED.get(query, query)

    with patch("app.normalizer.normalizer.default_llm.normalize", side_effect=_counting_fake):
        first = _run(default_normalizer.normalize("ma australia janu cha kasari?"))
        second = _run(default_normalizer.normalize("ma australia janu cha kasari?"))

    assert call_count["n"] == 1, "second call should hit cache, not LLM"
    assert first.normalized == second.normalized
    assert second.source == "cache"


def test_cache_is_case_and_whitespace_insensitive():
    """Cosmetic differences shouldn't double-pay the LLM."""
    call_count = {"n": 0}

    async def _counting_fake(system: str, query: str) -> str:
        call_count["n"] += 1
        return _CANNED.get(query, query)

    with patch("app.normalizer.normalizer.default_llm.normalize", side_effect=_counting_fake):
        _run(default_normalizer.normalize("ma australia janu cha kasari?"))
        _run(default_normalizer.normalize("  MA AUSTRALIA JANU CHA KASARI?  "))

    assert call_count["n"] == 1, "case/whitespace variants should hit the same cache row"


# ---------------------------------------------------------------------------
# Failure fall-through
# ---------------------------------------------------------------------------
def test_llm_exception_falls_through_with_original():
    """A normalizer hiccup must never block a chat request."""

    async def _exploding_fake(system: str, query: str) -> str:
        raise RuntimeError("simulated rate-limit")

    with patch("app.normalizer.normalizer.default_llm.normalize", side_effect=_exploding_fake):
        result = _run(default_normalizer.normalize("ma australia janu cha kasari?"))

    assert result.normalized == "ma australia janu cha kasari?"
    assert result.was_changed is False
    assert result.source == "fallback"


def test_empty_input_short_circuits():
    result = _run(default_normalizer.normalize(""))
    assert result.normalized == ""
    assert result.was_changed is False
    assert result.source == "fallback"


# ---------------------------------------------------------------------------
# Output cleaning
# ---------------------------------------------------------------------------
def test_strips_translation_prefix():
    assert _clean_llm_output("Translation: How are you?", fallback="x") == "How are you?"
    assert _clean_llm_output("Output: How are you?", fallback="x") == "How are you?"
    assert _clean_llm_output("English: How are you?", fallback="x") == "How are you?"


def test_strips_wrapping_quotes():
    assert _clean_llm_output('"How are you?"', fallback="x") == "How are you?"
    assert _clean_llm_output("'How are you?'", fallback="x") == "How are you?"


def test_empty_llm_output_falls_back():
    assert _clean_llm_output("", fallback="original") == "original"
    assert _clean_llm_output("   ", fallback="original") == "original"


def test_unchanged_when_no_prefix_no_quotes():
    assert _clean_llm_output("How are you?", fallback="x") == "How are you?"
