"""Admin API — student management, chat monitoring, manual replies, documents."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
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
from app.core.db import get_chroma, get_session
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


class LastMessage(BaseModel):
    content: str
    role: str
    created_at: datetime


class StudentListItem(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str | None
    education_level: str
    target_countries: list[str]
    preferred_field: str | None
    gpa: float | None
    ai_paused: bool
    created_at: datetime
    chat_count: int = 0
    doc_count: int = 0
    last_message: LastMessage | None = None


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
    chat_count: int = 0
    doc_count: int = 0


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


class DocItem(BaseModel):
    filename: str
    doc_id: str
    doc_type: str
    ext: str
    is_image: bool
    size_bytes: int
    uploaded_at: str


class StatsResponse(BaseModel):
    total_students: int
    total_chats: int
    students_this_week: int
    chats_today: int
    ai_paused_count: int
    total_documents: int
    top_countries: list[dict]
    recent_students: list[dict]


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


def _count_student_docs(student_id: str) -> int:
    doc_dir = Path(settings.upload_dir) / student_id
    if not doc_dir.exists():
        return 0
    return len([f for f in doc_dir.iterdir() if f.is_file()])


_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def _list_student_docs(student_id: str) -> list[DocItem]:
    doc_dir = Path(settings.upload_dir) / student_id
    if not doc_dir.exists():
        return []
    docs = []
    collection = get_chroma()
    for f in sorted(doc_dir.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if not f.is_file():
            continue
        doc_id = f.stem
        ext = f.suffix.lower()
        title = f.name
        doc_type = "other"
        try:
            results = collection.get(where={"doc_id": doc_id}, limit=1, include=["metadatas"])
            metas = results.get("metadatas") if results else None
            if metas and len(metas) > 0:
                title = metas[0].get("title", f.name)
                doc_type = metas[0].get("doc_type", "other") or "other"
        except Exception:
            pass
        stat = f.stat()
        docs.append(DocItem(
            filename=title,
            doc_id=doc_id,
            doc_type=doc_type,
            ext=ext,
            is_image=ext in _IMAGE_EXTS,
            size_bytes=stat.st_size,
            uploaded_at=datetime.fromtimestamp(stat.st_mtime).isoformat(),
        ))
    return docs


# ── Login ─────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def admin_login(req: LoginRequest) -> LoginResponse:
    pw_hash = settings.admin_password_hash or _DEFAULT_HASH
    if req.username != settings.admin_username or not verify_password(req.password, pw_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(req.username)
    return LoginResponse(access_token=token)


# ── Global AI toggle ──────────────────────────────────────────────────

@router.get("/ai-global")
async def admin_get_global_ai(
    _admin: str = Depends(get_current_admin),
) -> dict:
    return {"paused": settings.ai_globally_paused}


@router.put("/ai-global")
async def admin_set_global_ai(
    req: ToggleAIRequest,
    _admin: str = Depends(get_current_admin),
) -> dict:
    settings.ai_globally_paused = req.paused
    return {"paused": settings.ai_globally_paused}


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

    total_docs = 0
    upload_dir = Path(settings.upload_dir)
    if upload_dir.exists():
        for d in upload_dir.iterdir():
            if d.is_dir():
                total_docs += len([f for f in d.iterdir() if f.is_file()])

    country_rows = await db.execute(
        select(StudentModel.target_countries).where(StudentModel.target_countries != None)  # noqa: E711
    )
    country_freq: dict[str, int] = {}
    for (countries,) in country_rows:
        if isinstance(countries, list):
            for c in countries:
                country_freq[c] = country_freq.get(c, 0) + 1
    top_countries = sorted(
        [{"country": k, "count": v} for k, v in country_freq.items()],
        key=lambda x: x["count"], reverse=True,
    )[:5]

    recent_rows = await db.execute(
        select(StudentModel).order_by(StudentModel.created_at.desc()).limit(5)
    )
    recent_students = [
        {"id": str(s.id), "name": s.full_name, "email": s.email,
         "created_at": s.created_at.isoformat()}
        for s in recent_rows.scalars().all()
    ]

    return StatsResponse(
        total_students=total_students,
        total_chats=total_chats,
        students_this_week=students_week,
        chats_today=chats_today,
        ai_paused_count=paused,
        total_documents=total_docs,
        top_countries=top_countries,
        recent_students=recent_students,
    )


# ── Students list ─────────────────────────────────────────────────────

@router.get("/students")
async def admin_list_students(
    page: int = 1,
    per_page: int = 20,
    search: str = "",
    _admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_session),
) -> dict:
    offset = (max(page, 1) - 1) * per_page

    base_query = select(StudentModel)
    count_query = select(func.count(StudentModel.id))
    if search:
        like = f"%{search}%"
        base_query = base_query.where(
            StudentModel.full_name.ilike(like) | StudentModel.email.ilike(like)
        )
        count_query = count_query.where(
            StudentModel.full_name.ilike(like) | StudentModel.email.ilike(like)
        )

    total = (await db.execute(count_query)).scalar() or 0

    stmt = base_query.order_by(StudentModel.created_at.desc()).offset(offset).limit(per_page)
    rows = (await db.execute(stmt)).scalars().all()

    items = []
    for s in rows:
        chat_count = (await db.execute(
            select(func.count(ChatTurnModel.id)).where(ChatTurnModel.student_id == s.id)
        )).scalar() or 0

        last_msg_row = (await db.execute(
            select(ChatTurnModel)
            .where(ChatTurnModel.student_id == s.id)
            .order_by(ChatTurnModel.created_at.desc())
            .limit(1)
        )).scalar_one_or_none()

        last_message = None
        if last_msg_row:
            last_message = LastMessage(
                content=last_msg_row.content[:120],
                role=last_msg_row.role,
                created_at=last_msg_row.created_at,
            )

        doc_count = _count_student_docs(str(s.id))

        items.append(StudentListItem(
            id=str(s.id), full_name=s.full_name, email=s.email, phone=s.phone,
            education_level=s.education_level, target_countries=s.target_countries or [],
            preferred_field=s.preferred_field, gpa=s.gpa,
            ai_paused=s.ai_paused or False, created_at=s.created_at,
            chat_count=chat_count, doc_count=doc_count, last_message=last_message,
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
    chat_count = (await db.execute(
        select(func.count(ChatTurnModel.id)).where(ChatTurnModel.student_id == s.id)
    )).scalar() or 0
    doc_count = _count_student_docs(student_id)
    return StudentDetail(
        id=str(s.id), full_name=s.full_name, email=s.email, phone=s.phone,
        location=s.location, education_level=s.education_level, gpa=s.gpa,
        target_countries=s.target_countries or [], preferred_field=s.preferred_field,
        goals=s.goals, ai_paused=s.ai_paused or False,
        created_at=s.created_at, updated_at=s.updated_at,
        chat_count=chat_count, doc_count=doc_count,
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


# ── Student documents ─────────────────────────────────────────────────

@router.get("/students/{student_id}/documents", response_model=list[DocItem])
async def admin_get_documents(
    student_id: str,
    _admin: str = Depends(get_current_admin),
) -> list[DocItem]:
    _parse_uuid(student_id)
    return _list_student_docs(student_id)


@router.get("/students/{student_id}/documents/{doc_id}/download")
async def admin_download_document(
    student_id: str,
    doc_id: str,
    _admin: str = Depends(get_current_admin),
):
    _parse_uuid(student_id)
    doc_dir = Path(settings.upload_dir) / student_id
    mime_map = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".webp": "image/webp", ".pdf": "application/pdf", ".txt": "text/plain",
    }
    if doc_dir.exists():
        for f in doc_dir.iterdir():
            if f.stem == doc_id and f.is_file():
                media = mime_map.get(f.suffix.lower(), "application/octet-stream")
                # inline so admins can preview images/PDFs in-browser
                return FileResponse(str(f), media_type=media, headers={"Content-Disposition": f'inline; filename="{f.name}"'})
    raise HTTPException(status_code=404, detail="Document not found")


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
