"""Admin API — student management, chat monitoring, manual replies."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    create_access_token,
    get_current_admin,
    hash_password,
    verify_password,
)
from app.core.config import settings
from app.core.db import get_session
from app.models.student import ChatTurnModel, StudentModel

router = APIRouter()

_DEFAULT_HASH = hash_password("7654321a")


# ── Schemas ───────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class StudentListItem(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str | None
    education_level: str
    target_countries: list[str]
    ai_paused: bool
    created_at: datetime
    chat_count: int = 0


class StudentDetail(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str | None
    location: str | None
    education_level: str
    gpa: float | None
    target_countries: list[str]
    preferred_field: str | None
    goals: str | None
    ai_paused: bool
    created_at: datetime
    updated_at: datetime


class ChatTurnItem(BaseModel):
    id: str
    role: str
    content: str
    eval_decision: str | None
    created_at: datetime


class ToggleAIRequest(BaseModel):
    paused: bool


class ReplyRequest(BaseModel):
    content: str


class StatsResponse(BaseModel):
    total_students: int
    total_chats: int
    students_this_week: int
    chats_today: int
    ai_paused_count: int


# ── Login ─────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def admin_login(req: LoginRequest) -> LoginResponse:
    pw_hash = settings.admin_password_hash or _DEFAULT_HASH
    if req.username != settings.admin_username or not verify_password(req.password, pw_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(req.username)
    return LoginResponse(access_token=token)


# ── Stats ─────────────────────────────────────────────────────────────

@router.get("/stats", response_model=StatsResponse)
async def admin_stats(
    _admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_session),
) -> StatsResponse:
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_students = (await db.execute(select(func.count(StudentModel.id)))).scalar() or 0
    total_chats = (await db.execute(select(func.count(ChatTurnModel.id)))).scalar() or 0
    students_week = (await db.execute(
        select(func.count(StudentModel.id)).where(StudentModel.created_at >= week_ago)
    )).scalar() or 0
    chats_today = (await db.execute(
        select(func.count(ChatTurnModel.id)).where(ChatTurnModel.created_at >= today_start)
    )).scalar() or 0
    paused = (await db.execute(
        select(func.count(StudentModel.id)).where(StudentModel.ai_paused == True)  # noqa: E712
    )).scalar() or 0

    return StatsResponse(
        total_students=total_students,
        total_chats=total_chats,
        students_this_week=students_week,
        chats_today=chats_today,
        ai_paused_count=paused,
    )


# ── Students list ─────────────────────────────────────────────────────

@router.get("/students")
async def admin_list_students(
    page: int = 1,
    per_page: int = 20,
    _admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_session),
) -> dict:
    offset = (max(page, 1) - 1) * per_page
    total = (await db.execute(select(func.count(StudentModel.id)))).scalar() or 0

    stmt = (
        select(StudentModel)
        .order_by(StudentModel.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    rows = (await db.execute(stmt)).scalars().all()

    items = []
    for s in rows:
        chat_count = (await db.execute(
            select(func.count(ChatTurnModel.id)).where(ChatTurnModel.student_id == s.id)
        )).scalar() or 0
        items.append(StudentListItem(
            id=str(s.id),
            full_name=s.full_name,
            email=s.email,
            phone=s.phone,
            education_level=s.education_level,
            target_countries=s.target_countries or [],
            ai_paused=s.ai_paused or False,
            created_at=s.created_at,
            chat_count=chat_count,
        ))

    return {"items": [i.model_dump() for i in items], "total": total, "page": page, "per_page": per_page}


# ── Student detail ────────────────────────────────────────────────────

@router.get("/students/{student_id}", response_model=StudentDetail)
async def admin_get_student(
    student_id: str,
    _admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_session),
) -> StudentDetail:
    sid = _parse_uuid(student_id)
    s = await _get_student(db, sid)
    return StudentDetail(
        id=str(s.id), full_name=s.full_name, email=s.email, phone=s.phone,
        location=s.location, education_level=s.education_level, gpa=s.gpa,
        target_countries=s.target_countries or [], preferred_field=s.preferred_field,
        goals=s.goals, ai_paused=s.ai_paused or False,
        created_at=s.created_at, updated_at=s.updated_at,
    )


# ── Student chat history ──────────────────────────────────────────────

@router.get("/students/{student_id}/chat", response_model=list[ChatTurnItem])
async def admin_get_chat(
    student_id: str,
    _admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_session),
) -> list[ChatTurnItem]:
    sid = _parse_uuid(student_id)
    stmt = (
        select(ChatTurnModel)
        .where(ChatTurnModel.student_id == sid)
        .order_by(ChatTurnModel.created_at.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [
        ChatTurnItem(id=str(r.id), role=r.role, content=r.content,
                     eval_decision=r.eval_decision, created_at=r.created_at)
        for r in rows
    ]


# ── Toggle AI ─────────────────────────────────────────────────────────

@router.put("/students/{student_id}/ai-toggle")
async def admin_toggle_ai(
    student_id: str,
    req: ToggleAIRequest,
    _admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_session),
) -> dict:
    sid = _parse_uuid(student_id)
    s = await _get_student(db, sid)
    s.ai_paused = req.paused
    s.updated_at = datetime.utcnow()
    await db.commit()
    return {"ai_paused": s.ai_paused}


# ── Counselor reply ───────────────────────────────────────────────────

@router.post("/students/{student_id}/reply")
async def admin_reply(
    student_id: str,
    req: ReplyRequest,
    _admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_session),
) -> dict:
    sid = _parse_uuid(student_id)
    await _get_student(db, sid)
    turn = ChatTurnModel(
        id=uuid.uuid4(),
        student_id=sid,
        role="counselor",
        content=req.content,
        eval_decision="manual",
        created_at=datetime.utcnow(),
    )
    db.add(turn)
    await db.commit()
    return {"id": str(turn.id), "role": "counselor", "content": req.content}


# ── Helpers ───────────────────────────────────────────────────────────

def _parse_uuid(s: str) -> uuid.UUID:
    try:
        return uuid.UUID(s)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid student ID")


async def _get_student(db: AsyncSession, sid: uuid.UUID) -> StudentModel:
    result = await db.execute(select(StudentModel).where(StudentModel.id == sid))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student
