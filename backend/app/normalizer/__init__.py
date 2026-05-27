"""Language normalizer — Phase 5.

Turns Nepali-romanized / Hindi-romanized / code-switched study-abroad queries
into clean English BEFORE retrieval, so the English knowledge base actually
matches.

Pure-English queries pass through unchanged (the LLM is instructed to return
the input as-is when already English).

Usage from chat.py:

    from app.normalizer import default_normalizer
    result = await default_normalizer.normalize(req.message)
    query = result.normalized   # use this for retrieval / eval / generation
"""
from app.normalizer.normalizer import default_normalizer
from app.normalizer.types import NormalizationResult

__all__ = ["default_normalizer", "NormalizationResult"]
