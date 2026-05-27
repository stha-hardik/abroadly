"""Tests for hybrid Chroma + BM25 retrieval behavior."""
import pytest

from app.eval.confidence import grounding_score
from app.rag import retriever


class FakeCollection:
    def __init__(self) -> None:
        self.global_docs = {
            "ids": ["global-uk-visa", "global-aus"],
            "documents": [
                "UK student visa documents include CAS, passport, financial evidence, and English language proof.",
                "Australia student visa guidance mentions Confirmation of Enrolment and OSHC.",
            ],
            "metadatas": [
                {"kind": "global", "title": "UK student visa", "source_type": "global"},
                {"kind": "global", "title": "Australia student visa", "source_type": "global"},
            ],
        }
        self.student_docs = {
            "ids": ["student-1-upload"],
            "documents": ["The student's passport scan and IELTS certificate are uploaded."],
            "metadatas": [
                {
                    "kind": "student",
                    "title": "Student upload",
                    "source_type": "student",
                    "student_id": "student-1",
                }
            ],
        }

    def count(self) -> int:
        return len(self.global_docs["ids"]) + len(self.student_docs["ids"])

    def get(self, where=None, include=None, limit=None):
        _ = include, limit
        if where and "$and" in where:
            return self.student_docs
        return self.global_docs


@pytest.mark.asyncio
async def test_retrieve_uses_bm25_when_embedding_provider_fails(monkeypatch):
    monkeypatch.setattr(retriever, "get_chroma", lambda: FakeCollection())

    def fail_embed(*args, **kwargs):
        raise RuntimeError("embedding provider unavailable")

    monkeypatch.setattr(retriever, "_embed", fail_embed)

    result = await retriever.retrieve(
        query="What UK student visa documents need CAS?",
        student_id="student-1",
    )

    assert result.chunks
    assert result.chunks[0].id == "global-uk-visa"
    assert result.chunks[0].metadata["retrieval_method"] == "bm25"
    assert result.chunks[0].score >= 0.55


def test_grounding_counts_short_study_abroad_terms():
    chunks = [type("Chunk", (), {"text": "The UK visa process uses a CAS from the university."})()]

    assert grounding_score("UK CAS visa", chunks) == 1.0
