"""LLM provider abstraction.

All generation goes through llm.generate(). No Groq/Gemini SDK imports
outside this file. Swap providers by changing the active adapter here.
"""
from __future__ import annotations

from typing import Protocol

from app.core.config import settings

# Default generation parameters. Tuned for student-support tone — longer,
# more explanatory than the original 600-token cap.
MAX_TOKENS = 1000
TEMPERATURE = 0.4

# Generation models, tried in order — newest flash first, graceful fallback to
# known-good IDs if a newer one isn't available on this key/region.
GEMINI_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash"]

# Conversation history is a list of {"role": "user"|"assistant", "content": str}.
ChatHistory = list[dict]


class LLMProvider(Protocol):
    async def generate(
        self,
        system: str,
        context: str,
        profile: str,
        query: str,
        history: ChatHistory | None = None,
        mode: str = "full",
    ) -> str: ...

    async def normalize(self, system: str, query: str) -> str: ...


# Tuning for the normalizer call — much smaller + cheaper than generate().
NORMALIZER_MAX_TOKENS = 200
NORMALIZER_TEMPERATURE = 0.0  # deterministic; we want consistent translations
NORMALIZER_MODEL = "gemini-2.0-flash"  # Flash variant — fast, cheap, multilingual


class GroqGeminiLLM:
    """Gemini 2.0 Flash primary (stronger context/instruction following);
    Groq llama-3.3-70b fallback when Gemini is unavailable or rate-limited."""

    async def generate(
        self,
        system: str,
        context: str,
        profile: str,
        query: str,
        history: ChatHistory | None = None,
        mode: str = "full",
    ) -> str:
        import logging
        log = logging.getLogger("abroadly.llm")

        if settings.gemini_api_key:
            try:
                return await self._gemini(system, context, profile, query, history or [], mode)
            except Exception as e:
                log.error("Gemini failed: %s: %s", type(e).__name__, e)
        if settings.groq_api_key:
            try:
                return await self._groq(system, context, profile, query, history or [], mode)
            except Exception as e:
                log.error("Groq failed: %s: %s", type(e).__name__, e)
        return "Sorry, I'm having trouble connecting right now. Please try again in a moment."

    @staticmethod
    def _system_with_mode(system: str, mode: str) -> str:
        if mode == "partial":
            return (
                system
                + "\n\n## Mode: PARTIAL\nThe retrieved context is thin for this "
                "question. Answer the part you can ground, then explicitly name "
                "what you don't know, then point the student at the authoritative "
                "official source (university registrar URL, embassy URL, government "
                "immigration portal). Do not pretend the gap doesn't exist. Do not "
                "refuse the whole question because one part is missing."
            )
        return system

    @staticmethod
    def _user_payload(profile: str, context: str, query: str) -> str:
        return (
            f"<student-profile>\n{profile}\n</student-profile>\n\n"
            f"<knowledge-base>\n{context}\n</knowledge-base>\n\n"
            f"<student-message>\n{query}\n</student-message>\n\n"
            f"IMPORTANT: Respond to the student's actual message above. "
            f"Only reference facts from their profile or knowledge base. "
            f"Do not invent information they haven't shared."
        )

    async def _groq(
        self,
        system: str,
        context: str,
        profile: str,
        query: str,
        history: ChatHistory,
        mode: str,
    ) -> str:
        from groq import AsyncGroq

        client = AsyncGroq(api_key=settings.groq_api_key)
        messages: list[dict] = [{"role": "system", "content": self._system_with_mode(system, mode)}]
        for turn in history[-4:]:
            role = turn.get("role")
            content = turn.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": self._user_payload(profile, context, query)})

        for model in ("llama-3.3-70b-versatile", "llama-3.1-8b-instant"):
            try:
                resp = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=TEMPERATURE,
                    max_tokens=MAX_TOKENS,
                )
                return resp.choices[0].message.content.strip()
            except Exception:
                continue
        raise RuntimeError("All Groq models failed")

    async def _gemini(
        self,
        system: str,
        context: str,
        profile: str,
        query: str,
        history: ChatHistory,
        mode: str,
    ) -> str:
        from google import genai

        client = genai.Client(api_key=settings.gemini_api_key)
        contents = []
        for t in history[-4:]:
            role = t.get("role")
            content = t.get("content")
            if role in ("user", "assistant") and content:
                contents.append(genai.types.Content(
                    role="user" if role == "user" else "model",
                    parts=[genai.types.Part(text=content)],
                ))
        contents.append(genai.types.Content(
            role="user",
            parts=[genai.types.Part(text=self._user_payload(profile, context, query))],
        ))

        config = genai.types.GenerateContentConfig(
            system_instruction=self._system_with_mode(system, mode),
            temperature=TEMPERATURE,
            max_output_tokens=MAX_TOKENS,
        )
        # Prefer the newest flash; fall back to known-good IDs if a newer one
        # isn't available on this API key/region.
        last_err: Exception | None = None
        for model in GEMINI_MODELS:
            try:
                response = await client.aio.models.generate_content(
                    model=model, contents=contents, config=config,
                )
                text = (response.text or "").strip()
                if text:
                    return text
            except Exception as e:
                last_err = e
                continue
        if last_err:
            raise last_err
        raise RuntimeError("All Gemini models returned empty")

    async def normalize(self, system: str, query: str) -> str:
        if not settings.gemini_api_key:
            raise RuntimeError("normalizer_unavailable: no GEMINI_API_KEY")

        from google import genai

        client = genai.Client(api_key=settings.gemini_api_key)
        response = await client.aio.models.generate_content(
            model=NORMALIZER_MODEL,
            contents=query,
            config=genai.types.GenerateContentConfig(
                system_instruction=system,
                temperature=NORMALIZER_TEMPERATURE,
                max_output_tokens=NORMALIZER_MAX_TOKENS,
            ),
        )
        return (response.text or "").strip()


# Single instance — swap this to change the provider for the whole app.
default_llm: LLMProvider = GroqGeminiLLM()
