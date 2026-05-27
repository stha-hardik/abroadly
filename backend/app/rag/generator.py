"""LLM generation — delegates to llm.py provider abstraction.

Invoked when the eval layer returns PROCEED, or in 'partial' mode when
retrieval is thin but the question is in-scope and we want to give the
student something more useful than a refusal.
"""
from __future__ import annotations

from pathlib import Path

from app.eval.types import RetrievedSet
from app.rag.llm import ChatHistory, default_llm

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "system_prompt.md"


def _load_system_prompt() -> str:
    try:
        return _PROMPT_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        return "You are Abroadly, a free opensource study-abroad guidance assistant."


def _format_profile(student: dict) -> str:
    parts = [f"{k}: {v}" for k, v in student.items() if v]
    return "\n".join(parts) or "No profile data provided."


def _format_context(retrieved: RetrievedSet) -> str:
    """Format chunks with source titles so the LLM can cite them."""
    if not retrieved.chunks:
        return "(no retrieved chunks for this query)"
    parts = []
    for c in retrieved.chunks:
        title = c.metadata.get("title", "unknown source")
        parts.append(f"[Source: {title}]\n{c.text}")
    return "\n\n".join(parts)


async def generate_answer(
    query: str,
    retrieved: RetrievedSet,
    student: dict,
    history: ChatHistory | None = None,
    mode: str = "full",
) -> str:
    """Compose context from RetrievedChunks + student profile + history, pass to provider.

    mode: "full" when eval says PROCEED, "partial" when eval says LOW_CONFIDENCE
    but we still want to give the student a gap-honest answer instead of a refusal.
    """
    system = _load_system_prompt()
    context = _format_context(retrieved)
    profile = _format_profile(student)
    return await default_llm.generate(
        system=system,
        context=context,
        profile=profile,
        query=query,
        history=history,
        mode=mode,
    )
