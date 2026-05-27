"""LLM provider abstraction.

All generation goes through llm.generate(). No Groq/Gemini SDK imports
outside this file. Swap providers by changing the active adapter here.
"""
from __future__ import annotations

from typing import Protocol

from app.core.config import settings

# Default generation parameters. Tuned for student-support tone — longer,
# more explanatory than the original 600-token cap.
MAX_TOKENS = 2000
TEMPERATURE = 0.1

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


class GroqGeminiLLM:
    """Groq llama-3.3-70b primary; Gemini flash fallback."""

    async def generate(
        self,
        system: str,
        context: str,
        profile: str,
        query: str,
        history: ChatHistory | None = None,
        mode: str = "full",
    ) -> str:
        if settings.groq_api_key:
            try:
                return await self._groq(system, context, profile, query, history or [], mode)
            except Exception:
                pass
        return await self._gemini(system, context, profile, query, history or [], mode)

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
            f"Student Profile:\n{profile}\n\n"
            f"Retrieved Context:\n{context}\n\n"
            f"Current Question: {query}"
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
        # Replay prior turns (already user/assistant shaped).
        for turn in history:
            role = turn.get("role")
            content = turn.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": self._user_payload(profile, context, query)})

        resp = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS,
        )
        return resp.choices[0].message.content.strip()

    async def _gemini(
        self,
        system: str,
        context: str,
        profile: str,
        query: str,
        history: ChatHistory,
        mode: str,
    ) -> str:
        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(
            "gemini-1.5-flash",
            system_instruction=self._system_with_mode(system, mode),
            generation_config={"temperature": TEMPERATURE, "max_output_tokens": MAX_TOKENS},
        )
        # Gemini expects "user" / "model" role names.
        gemini_history = [
            {"role": "user" if t["role"] == "user" else "model", "parts": [t["content"]]}
            for t in history
            if t.get("role") in ("user", "assistant") and t.get("content")
        ]
        chat = model.start_chat(history=gemini_history)
        resp = await chat.send_message_async(self._user_payload(profile, context, query))
        return resp.text.strip()


# Single instance — swap this to change the provider for the whole app.
default_llm: LLMProvider = GroqGeminiLLM()
