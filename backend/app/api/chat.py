"""Chat endpoint — retrieve -> rerank -> evaluate -> (generate | partial-answer | clarify | refuse).

Refusal-first: the eval layer runs before generation. If the scope is denied,
no LLM call is made. For low-confidence-but-in-scope queries we now run a
'partial-answer' generation that names the gap and points at the authoritative
source — better than a bare clarifier when retrieval is thin but plausible.

Every request carries request_id + trace_id for observability and audit.
Every turn (user + assistant) is persisted to chat_turns for conversation memory.
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
from app.models.student import ChatTurnModel, ChatTurnOut, StudentModel
from app.rag.generator import generate_answer
from app.rag.reranker import rerank
from app.rag.retriever import retrieve

router = APIRouter()

# How many prior turns to feed the LLM. Keeps the prompt small and the
# token bill predictable; bump if conversations consistently outgrow it.
HISTORY_TURN_LIMIT = 10


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


async def _load_history(db: AsyncSession, student_id: uuid.UUID, limit: int) -> list[dict]:
    """Most recent N turns for this student, ordered oldest→newest for LLM context."""
    stmt = (
        select(ChatTurnModel)
        .where(ChatTurnModel.student_id == student_id)
        .order_by(ChatTurnModel.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    rows = list(reversed(rows))  # chronological for the LLM
    return [{"role": r.role, "content": r.content} for r in rows]


async def _persist_turn(
    db: AsyncSession,
    *,
    student_id: uuid.UUID,
    role: str,
    content: str,
    eval_decision: str | None = None,
) -> None:
    db.add(
        ChatTurnModel(
            student_id=student_id,
            role=role,
            content=content,
            eval_decision=eval_decision,
        )
    )


@router.post("", response_model=ChatResponse)
async def chat_endpoint(
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

    history = await _load_history(db, sid, HISTORY_TURN_LIMIT)

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

    await _persist_turn(db, student_id=sid, role="user", content=query)

    base = dict(
        request_id=request_id,
        trace_id=trace_id,
        decision=decision.decision,
        confidence=decision.confidence,
        reason=decision.reason,
    )

    async def _finalize(resp: ChatResponse) -> ChatResponse:
        # Persist assistant turn (only when there's a real answer to remember)
        if resp.answer:
            await _persist_turn(
                db,
                student_id=sid,
                role="assistant",
                content=resp.answer,
                eval_decision=str(resp.decision),
            )
        await db.commit()
        return resp

    if decision.decision == Decision.PROCEED:
        answer = await generate_answer(
            query=query,
            retrieved=retrieved,
            student=student,
            history=history,
            mode="full",
        )
        return await _finalize(ChatResponse(**base, answer=answer, sources=sources))

    if decision.decision == Decision.LOW_CONFIDENCE:
        # Partial-answer path: retrieval is thin but plausible — give a gap-honest
        # answer pointing at the authoritative source, rather than a bare clarifier.
        if decision.debug.get("partial_answer"):
            answer = await generate_answer(
                query=query,
                retrieved=retrieved,
                student=student,
                history=history,
                mode="partial",
            )
            return await _finalize(ChatResponse(**base, answer=answer, sources=sources))
        # Otherwise: pure clarifier, no generation.
        return await _finalize(
            ChatResponse(
                **base,
                clarification_needed=True,
                clarifying_question=decision.clarifying_question,
            )
        )

    if decision.decision == Decision.OUT_OF_SCOPE:
        return await _finalize(ChatResponse(**base, answer=decision.refusal_message))

    if decision.decision == Decision.ESCALATE:
        # No consultancy attachment — point at the official portal instead.
        return await _finalize(
            ChatResponse(
                **base,
                answer=decision.refusal_message
                or "This step happens on the official government / university portal — not through a consultancy.",
            )
        )

    raise HTTPException(status_code=500, detail="unknown_eval_decision")


@router.get("/history/{student_id}", response_model=list[ChatTurnOut])
async def chat_history(
    student_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_session),
) -> list[ChatTurnOut]:
    """Return chronological chat history for a student. Used by frontend on /chat mount."""
    try:
        sid = uuid.UUID(student_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_student_id")

    stmt = (
        select(ChatTurnModel)
        .where(ChatTurnModel.student_id == sid)
        .order_by(ChatTurnModel.created_at.desc())
        .limit(min(max(limit, 1), 200))
    )
    rows = (await db.execute(stmt)).scalars().all()
    rows = list(reversed(rows))
    return [
        ChatTurnOut(
            id=str(r.id),
            role=r.role,  # type: ignore[arg-type]
            content=r.content,
            eval_decision=r.eval_decision,
            created_at=r.created_at,
        )
        for r in rows
    ]
