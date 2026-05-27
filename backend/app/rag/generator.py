"""LLM generation — delegates to llm.py provider abstraction.

Invoked when the eval layer returns PROCEED, or in 'partial' mode when
retrieval is thin but the question is in-scope and we want to give the
student something more useful than a refusal.
"""
from __future__ import annotations

import re
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


def _clean_title(raw: str) -> str:
    """Turn 12-faq-nepali-students.md → FAQ Nepali students."""
    name = re.sub(r"^\d+-", "", raw)
    name = re.sub(r"\.(md|txt|pdf)$", "", name)
    name = name.replace("-", " ").replace("_", " ").strip()
    if name:
        name = name[0].upper() + name[1:]
    return name or raw


def _format_context(retrieved: RetrievedSet) -> str:
    """Format chunks with clean source titles so the LLM can cite them."""
    if not retrieved.chunks:
        return "(no retrieved chunks for this query)"
    parts = []
    for c in retrieved.chunks:
        raw_title = c.metadata.get("title", "unknown source")
        title = _clean_title(raw_title)
        parts.append(f"[Source: {title}]\n{c.text}")
    return "\n\n".join(parts)


def _clean_response(text: str) -> str:
    """Strip all source references, trailing sections, and formatting artifacts."""
    text = re.sub(r"\[Source:[^\]]*\]", "", text)
    text = re.sub(r"\*\*Sources?\*\*[\s\S]*?(?=\n\*\*|$)", "", text)
    text = re.sub(r"Sources?:\s*\n[\s\S]*?(?=\n\*\*|$)", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


async def generate_answer(
    query: str,
    retrieved: RetrievedSet,
    student: dict,
    history: ChatHistory | None = None,
    mode: str = "full",
) -> str:
    system = _load_system_prompt()
    context = _format_context(retrieved)
    profile = _format_profile(student)
    answer = await default_llm.generate(
        system=system,
        context=context,
        profile=profile,
        query=query,
        history=history,
        mode=mode,
    )
    return _clean_response(answer)
