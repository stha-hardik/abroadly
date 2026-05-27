"""Stub tests for the eval layer. Run with: pytest backend/tests"""
from app.eval.evaluator import default_evaluator
from app.eval.types import Decision, RetrievedChunk, RetrievedSet


def _mk(content: str, score: float = 0.8) -> RetrievedChunk:
    return RetrievedChunk(
        id="doc-1",
        text=content,
        metadata={"title": "doc"},
        score=score,
        source_type="global",
    )


def test_out_of_scope_medical():
    out = default_evaluator.evaluate(
        query="What medication should I take for migraines?",
        student={},
        retrieved=RetrievedSet(chunks=[]),
    )
    assert out.decision == Decision.OUT_OF_SCOPE
    assert out.scope_label == "medical"


def test_low_confidence_when_no_retrieval():
    out = default_evaluator.evaluate(
        query="What IELTS score do I need for Canada study permit?",
        student={"target_countries": ["Canada"], "education_level": "plus_two"},
        retrieved=RetrievedSet(chunks=[]),
    )
    # Empty retrieval -> below threshold
    assert out.decision == Decision.LOW_CONFIDENCE


def test_proceed_when_evidence_strong():
    docs = [_mk("IELTS 6.5 overall with no band below 6.0 is the typical Canada study permit requirement for undergrad.", 0.82)]
    out = default_evaluator.evaluate(
        query="What IELTS score do I need for Canada undergrad?",
        student={"target_countries": ["Canada"]},
        retrieved=RetrievedSet(chunks=docs),
    )
    assert out.decision == Decision.PROCEED


def test_escalate_on_high_stakes():
    docs = [_mk("Tuition payment is done after I-20 issuance.", 0.9)]
    out = default_evaluator.evaluate(
        query="How do I pay tuition to the university?",
        student={"target_countries": ["USA"]},
        retrieved=RetrievedSet(chunks=docs),
    )
    assert out.decision == Decision.ESCALATE


def test_study_in_uk_documents_is_in_scope_but_low_confidence_without_retrieval():
    out = default_evaluator.evaluate(
        query="What documents do I need to study in the UK?",
        student={"target_countries": ["UK"], "education_level": "plus_two"},
        retrieved=RetrievedSet(chunks=[]),
    )
    assert out.decision == Decision.LOW_CONFIDENCE
    assert out.scope_label == "documents"
