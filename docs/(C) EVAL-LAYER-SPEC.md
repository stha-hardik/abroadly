# Eval Layer Spec

The eval layer runs BEFORE generation. If it says no, no answer is generated. Refusal-first.

## Three checks

1. **Knows?** — Did retrieval actually return evidence relevant to the query? (retrieval-grounding, not parametric guessing.)
2. **Reliable?** — Is the top-evidence score above threshold AND does the query-evidence overlap survive a lightweight grounding check?
3. **In-scope?** — Is the query inside Abroadly's domain (study abroad, education paths, scholarships, docs, consultancy guidance)? Explicit deny-list: medical, legal, financial advice beyond scholarship info, personal/relationship, anything political.

## Interface (Python)

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol

class Decision(str, Enum):
    PROCEED        = "proceed"          # generate
    LOW_CONFIDENCE = "low_confidence"   # ask clarifying Q
    OUT_OF_SCOPE   = "out_of_scope"     # refuse politely
    ESCALATE       = "escalate"         # hand to consultancy

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
    reason: str                       # short, log-safe
    confidence: float                 # aggregate 0..1 — min(retrieval_score, grounding_score)
    retrieval_score: float            # top chunk score, 0..1
    grounding_score: float            # token-overlap coverage, 0..1
    scope_label: str                  # e.g. "study_abroad", "medical", "legal"
    clarification_needed: bool = False
    clarifying_question: str | None = None   # set when LOW_CONFIDENCE
    refusal_message: str | None = None       # set when OUT_OF_SCOPE or ESCALATE
    debug: dict = field(default_factory=dict)  # raw signals — never returned to client

class Evaluator(Protocol):
    def evaluate(
        self,
        query: str,
        student: dict,           # profile context (gpa, level, goals, ...)
        retrieved: RetrievedSet,
    ) -> EvalDecision: ...
```

## Pipeline position

```
retrieve -> rerank -> eval -> generate
```

- **rerank** is a no-op pass-through in v1. Slot exists so a cross-encoder slots in without touching `chat.py` or eval.
- eval consumes `RetrievedSet` — never raw Chroma dicts. Vendor isolation is enforced by the type boundary.

## Decision rules (v1 — tune thresholds in `policies.py`)

| condition                                                     | decision        |
| ------------------------------------------------------------- | --------------- |
| `scope_label` not in allowed set                              | OUT_OF_SCOPE    |
| `retrieved.top_score < EVAL_MIN_RETRIEVAL_SCORE`              | LOW_CONFIDENCE  |
| `grounding_score < EVAL_MIN_GROUNDING_SCORE`                  | LOW_CONFIDENCE  |
| query signals high-stakes commitment (visa filing, payment)   | ESCALATE        |
| else                                                          | PROCEED         |

## Submodules

- `scope_check.py` — fast classifier. v1: rule-based keyword + regex bank with explicit deny categories. v2: small LLM call with cached results.
- `confidence.py` — computes `grounding_score`. v1: token-overlap heuristic between query terms and concatenated top-K docs (cheap, no extra LLM call). v2: NLI-style cross-encoder.
- `policies.py` — thresholds, refusal templates, clarifying-question templates. Single source of truth — env-overridable.
- `evaluator.py` — orchestrates the three checks, returns `EvalDecision`.

## Refusal & clarifying templates (live in `policies.py`)

- OUT_OF_SCOPE: "I can only help with study-abroad guidance. For X, please talk to a qualified professional."
- LOW_CONFIDENCE: "I don't have a confident answer on that. Could you tell me more about Y?" (Y inferred from missing student-profile field or empty retrieval facet.)
- ESCALATE: "This is a step worth talking to a real consultancy about. Want me to suggest one?"

## Why separate, not inline

- **Phase 5** inserts a `LanguageNormalizer` BEFORE the eval layer — eval signature doesn't change.
- **Phase 6** consumes `ESCALATE` decisions as the trigger to attach matched partners — eval signature doesn't change.
- Swap heuristic confidence for cross-encoder later without touching `chat.py`.
- Unit-testable in isolation. `tests/test_eval.py` only mocks `RetrievedSet`.

## What it is NOT

- Not a safety filter for the LLM output (that's a separate post-gen pass we'll add when needed).
- Not a router to different models — generation choice stays in `rag/generator.py`.
- Not stateful — pure function over inputs.
