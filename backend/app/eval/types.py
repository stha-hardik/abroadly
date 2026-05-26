"""Shared eval types. Keeping these in their own file so api/, rag/, and eval/ can
all import without cycles."""
from dataclasses import dataclass, field
from enum import Enum


class Decision(str, Enum):
    PROCEED = "proceed"
    LOW_CONFIDENCE = "low_confidence"
    OUT_OF_SCOPE = "out_of_scope"
    ESCALATE = "escalate"


@dataclass(frozen=True)
class RetrievedChunk:
    id: str
    text: str
    score: float
    source_type: str          # "global" | "student"
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True)
class RetrievedSet:
    chunks: list[RetrievedChunk]

    @property
    def top_score(self) -> float:
        return max((c.score for c in self.chunks), default=0.0)


@dataclass(frozen=True)
class EvalDecision:
    decision: Decision
    reason: str
    confidence: float         # aggregate 0..1 — min(retrieval_score, grounding_score)
    retrieval_score: float
    grounding_score: float
    scope_label: str
    clarification_needed: bool = False
    clarifying_question: str | None = None
    refusal_message: str | None = None
    debug: dict = field(default_factory=dict)
