"""The three-check eval layer. Pure function over (query, student, retrieved)."""
from __future__ import annotations

from app.eval import policies
from app.eval.confidence import grounding_score
from app.eval.scope_check import classify_scope
from app.eval.types import Decision, EvalDecision, RetrievedSet


class Evaluator:
    """Default implementation. Swap by injecting a different class with the same shape."""

    def evaluate(
        self,
        query: str,
        student: dict,
        retrieved: RetrievedSet,
    ) -> EvalDecision:
        scope = classify_scope(query)
        retrieval_score = retrieved.top_score
        ground = grounding_score(query, retrieved.chunks)
        confidence = min(retrieval_score, ground)
        debug = {"scope": scope, "retrieval_score": retrieval_score, "grounding": ground, "confidence": confidence}

        # 1. Scope check — hard deny
        if scope in {"medical", "legal", "financial_advice", "personal", "political"}:
            return EvalDecision(
                decision=Decision.OUT_OF_SCOPE,
                reason=f"scope_denied:{scope}",
                confidence=0.0,
                retrieval_score=retrieval_score,
                grounding_score=ground,
                scope_label=scope,
                refusal_message=policies.REFUSAL_TEMPLATES.get(scope, policies.REFUSAL_TEMPLATES["default"]),
                debug=debug,
            )

        # 2. Unknown scope under strict mode -> refuse
        if scope == "unknown" and policies.SCOPE_STRICT:
            return EvalDecision(
                decision=Decision.OUT_OF_SCOPE,
                reason="scope_unknown_strict",
                confidence=0.0,
                retrieval_score=retrieval_score,
                grounding_score=ground,
                scope_label=scope,
                refusal_message=policies.REFUSAL_TEMPLATES["default"],
                debug=debug,
            )

        # 3. High-stakes escalation
        if any(kw in query.lower() for kw in ("file visa", "pay tuition", "send money", "sign contract")):
            return EvalDecision(
                decision=Decision.ESCALATE,
                reason="high_stakes_action",
                confidence=confidence,
                retrieval_score=retrieval_score,
                grounding_score=ground,
                scope_label=scope,
                refusal_message=policies.ESCALATE_MESSAGE,
                debug=debug,
            )

        # 4. Retrieval too weak
        if retrieval_score < policies.MIN_RETRIEVAL_SCORE:
            return EvalDecision(
                decision=Decision.LOW_CONFIDENCE,
                reason="retrieval_below_threshold",
                confidence=confidence,
                retrieval_score=retrieval_score,
                grounding_score=ground,
                scope_label=scope,
                clarification_needed=True,
                clarifying_question=self._pick_clarifier(student),
                debug=debug,
            )

        # 5. Grounding too weak
        if ground < policies.MIN_GROUNDING_SCORE:
            return EvalDecision(
                decision=Decision.LOW_CONFIDENCE,
                reason="grounding_below_threshold",
                confidence=confidence,
                retrieval_score=retrieval_score,
                grounding_score=ground,
                scope_label=scope,
                clarification_needed=True,
                clarifying_question=policies.CLARIFYING_TEMPLATES["low_evidence"],
                debug=debug,
            )

        return EvalDecision(
            decision=Decision.PROCEED,
            reason="ok",
            confidence=confidence,
            retrieval_score=retrieval_score,
            grounding_score=ground,
            scope_label=scope,
            debug=debug,
        )

    @staticmethod
    def _pick_clarifier(student: dict) -> str:
        if not student.get("target_countries"):
            return policies.CLARIFYING_TEMPLATES["missing_country"]
        if not student.get("education_level"):
            return policies.CLARIFYING_TEMPLATES["missing_level"]
        if not student.get("preferred_field"):
            return policies.CLARIFYING_TEMPLATES["missing_field"]
        return policies.CLARIFYING_TEMPLATES["default"]


default_evaluator = Evaluator()
