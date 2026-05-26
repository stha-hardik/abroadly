"""LLM generation — delegates to llm.py provider abstraction.

Only invoked AFTER the eval layer returns PROCEED. Generation is never
called speculatively.
"""
from __future__ import annotations

from pathlib import Path

from app.eval.types import RetrievedSet
from app.rag.llm import default_llm

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "system_prompt.md"


def _load_system_prompt() -> str:
    try:
        return _PROMPT_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        return "You are Abroadly, a study-abroad guidance assistant for Nepali students."


def _format_profile(student: dict) -> str:
    parts = [f"{k}: {v}" for k, v in student.items() if v]
    return "\n".join(parts) or "No profile data."


def _format_context(retrieved: RetrievedSet) -> str:
    """Format chunks with source titles so the LLM can cite them."""
    parts = []
    for c in retrieved.chunks:
        title = c.metadata.get("title", "unknown source")
        parts.append(f"[Source: {title}]\n{c.text}")
    return "\n\n".join(parts)


async def generate_answer(query: str, retrieved: RetrievedSet, student: dict) -> str:
    """Compose context from RetrievedChunks + student profile, pass to provider."""
    system = _load_system_prompt()
    context = _format_context(retrieved)
    profile = _format_profile(student)
    return await default_llm.generate(system=system, context=context, profile=profile, query=query)
