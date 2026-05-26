"""LLM provider abstraction.

All generation goes through llm.generate(). No Groq/Gemini SDK imports
outside this file. Swap providers by changing the active adapter here.
"""
from __future__ import annotations

from typing import Protocol

from app.core.config import settings


class LLMProvider(Protocol):
    async def generate(
        self,
        system: str,
        context: str,
        profile: str,
        query: str,
    ) -> str: ...


class GroqGeminiLLM:
    """Groq llama-3.3-70b primary; Gemini flash fallback."""

    async def generate(self, system: str, context: str, profile: str, query: str) -> str:
        if settings.groq_api_key:
            try:
                return await self._groq(system, context, profile, query)
            except Exception:
                pass
        return await self._gemini(system, context, profile, query)

    async def _groq(self, system: str, context: str, profile: str, query: str) -> str:
        from groq import AsyncGroq

        client = AsyncGroq(api_key=settings.groq_api_key)
        resp = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": (
                        f"Student Profile:\n{profile}\n\n"
                        f"Context:\n{context}\n\n"
                        f"Question: {query}"
                    ),
                },
            ],
            temperature=0,
            max_tokens=600,
        )
        return resp.choices[0].message.content.strip()

    async def _gemini(self, system: str, context: str, profile: str, query: str) -> str:
        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(
            "gemini-1.5-flash",
            system_instruction=system,
        )
        prompt = (
            f"Student Profile:\n{profile}\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {query}"
        )
        resp = await model.generate_content_async(prompt)
        return resp.text.strip()


# Single instance — swap this to change the provider for the whole app.
default_llm: LLMProvider = GroqGeminiLLM()
