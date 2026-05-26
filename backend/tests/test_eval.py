"""Stub tests for the eval layer. Run with: pytest backend/tests"""
from app.eval.evaluator import default_evaluator
from app.eval.types import Decision, RetrievedSet


def _mk(content: str, score: float = 0.8) -> dict:
    return {"content": content, "metadata": {"title": "doc"}, "score": score}


def test_out_of_scope_medical():
    out = default_evaluator.evaluate(
        query="What medication should I take for migraines?",
        student={},
        retrieved=RetrievedSet(docs=[], top_score=0.0),
    )
    assert out.decision == Decision.OUT_OF_SCOPE
    assert out.scope_label == "medical"


def test_low_confidence_when_no_retrieval():
    out = default_evaluator.evaluate(
        query="What IELTS score do I need for Canada study permit?",
        student={"target_countries": ["Canada"], "education_level": "plus_two"},
        retrieved=RetrievedSet(docs=[], top_score=0.0),
    )
    # Empty retrieval -> below threshold
    assert out.decision == Decision.LOW_CONFIDENCE


def test_proceed_when_evidence_strong():
    docs = [_mk("IELTS 6.5 overall with no band below 6.0 is the typical Canada study permit requirement for undergrad.", 0.82)]
    out = default_evaluator.evaluate(
        query="What IELTS score do I need for Canada undergrad?",
        student={"target_countries": ["Canada"]},
        retrieved=RetrievedSet(docs=docs, top_score=0.82),
    )
    assert out.decision == Decision.PROCEED


def test_escalate_on_high_stakes():
    docs = [_mk("Tuition payment is done after I-20 issuance.", 0.9)]
    out = default_evaluator.evaluate(
        query="How do I pay tuition to the university?",
        student={"target_countries": ["USA"]},
        retrieved=RetrievedSet(docs=docs, top_score=0.9),
    )
    assert out.decision == Decision.ESCALATE
