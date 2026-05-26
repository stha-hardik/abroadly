"""Chat endpoint — retrieve -> rerank -> evaluate -> (generate | refuse | clarify | escalate).

Refusal-first: the eval layer runs before generation. If it says no, no LLM call is made.
Every request carries request_id + trace_id for observability and audit.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import bindparam, select, text
from sqlalchemy.dialects.postgresql import JSONB as SAJsonb
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.eval.evaluator import default_evaluator
from app.eval.types import Decision, EvalDecision
from app.models.student import StudentModel
from app.rag.generator import generate_answer
from app.rag.reranker import rerank
from app.rag.retriever import retrieve

router = APIRouter()


class ChatRequest(BaseModel):
    student_id: str = Field(..., description="Existing student profile id")
    message: str = Field(..., min_length=1, max_length=4000)
    trace_id: str | None = Field(None, description="Caller-supplied trace id; generated if omitted")


class Source(BaseModel):
    chunk_id: str
    source_type: str
    score: float
    title: str | None = None


class ChatResponse(BaseModel):
    request_id: str
    trace_id: str
    decision: Decision
    confidence: float
    answer: str | None = None
    clarifying_question: str | None = None
    clarification_needed: bool = False
    sources: list[Source] = []
    reason: str
    debug: dict | None = None  # only populated in dev


async def _persist_audit(
    db: AsyncSession,
    *,
    request_id: str,
    trace_id: str,
    student_id: str,
    query: str,
    chunk_ids: list[str],
    retrieval_scores: list[float],
    eval_decision: str,
    eval_confidence: float,
    model_used: str,
) -> None:
    """Async INSERT into chat_audit."""
    stmt = text(
        """
        INSERT INTO chat_audit
            (request_id, trace_id, student_id, query,
             chunk_ids, retrieval_scores,
             eval_decision, eval_confidence, model_used, created_at)
        VALUES
            (:request_id, :trace_id, :student_id, :query,
             :chunk_ids, :retrieval_scores,
             :eval_decision, :eval_confidence, :model_used, :created_at)
        """
    ).bindparams(
        bindparam("chunk_ids", type_=SAJsonb()),
        bindparam("retrieval_scores", type_=SAJsonb()),
    )
    await db.execute(
        stmt,
        {
            "request_id": request_id,
            "trace_id": trace_id,
            "student_id": student_id,
            "query": query,
            "chunk_ids": chunk_ids,
            "retrieval_scores": retrieval_scores,
            "eval_decision": eval_decision,
            "eval_confidence": eval_confidence,
            "model_used": model_used,
            "created_at": datetime.utcnow(),
        },
    )
    await db.commit()


@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_session),
) -> ChatResponse:
    request_id = str(uuid.uuid4())
    trace_id = req.trace_id or str(uuid.uuid4())

    # Load real student profile from PG
    try:
        sid = uuid.UUID(req.student_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_student_id")

    result = await db.execute(select(StudentModel).where(StudentModel.id == sid))
    student_model = result.scalar_one_or_none()
    if not student_model:
        raise HTTPException(status_code=404, detail="student_not_found")

    student = {
        "id": str(student_model.id),
        "full_name": student_model.full_name,
        "email": student_model.email,
        "education_level": student_model.education_level,
        "gpa": student_model.gpa,
        "target_countries": student_model.target_countries,
        "preferred_field": student_model.preferred_field,
        "location": student_model.location,
        "goals": student_model.goals,
    }

    # TODO Phase 5: language normalization sits here
    query = req.message

    retrieved = await retrieve(query=query, student_id=req.student_id)
    retrieved = await rerank(query=query, retrieved=retrieved)
    decision: EvalDecision = default_evaluator.evaluate(query=query, student=student, retrieved=retrieved)

    sources = [
        Source(
            chunk_id=c.id,
            source_type=c.source_type,
            score=c.score,
            title=c.metadata.get("title"),
        )
        for c in retrieved.chunks
    ]

    await _persist_audit(
        db,
        request_id=request_id,
        trace_id=trace_id,
        student_id=req.student_id,
        query=query,
        chunk_ids=[c.id for c in retrieved.chunks],
        retrieval_scores=[c.score for c in retrieved.chunks],
        eval_decision=decision.decision,
        eval_confidence=decision.confidence,
        model_used="groq/llama-3.3-70b-versatile",
    )

    base = dict(
        request_id=request_id,
        trace_id=trace_id,
        decision=decision.decision,
        confidence=decision.confidence,
        reason=decision.reason,
    )

    if decision.decision == Decision.PROCEED:
        answer = await generate_answer(query=query, retrieved=retrieved, student=student)
        return ChatResponse(**base, answer=answer, sources=sources)

    if decision.decision == Decision.LOW_CONFIDENCE:
        return ChatResponse(
            **base,
            clarification_needed=True,
            clarifying_question=decision.clarifying_question,
        )

    if decision.decision == Decision.OUT_OF_SCOPE:
        return ChatResponse(**base, answer=decision.refusal_message)

    if decision.decision == Decision.ESCALATE:
        # TODO Phase 6: attach matched consultancy partners
        return ChatResponse(
            **base,
            answer=decision.refusal_message or "This is worth talking to a real consultancy about.",
        )

    raise HTTPException(status_code=500, detail="unknown_eval_decision")
