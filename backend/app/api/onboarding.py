"""Student onboarding endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.email import send_welcome_email
from app.models.student import StudentCreate, StudentModel, StudentOut, StudentUpdate

router = APIRouter()


class CallRequest(BaseModel):
    phone: str | None = None


def _to_out(model: StudentModel) -> StudentOut:
    """Convert ORM row -> Pydantic StudentOut, coercing UUID -> str."""
    return StudentOut.model_validate(
        {
            **{c.name: getattr(model, c.name) for c in model.__table__.columns},
            "id": str(model.id),
        }
    )


@router.post("", response_model=StudentOut, status_code=201)
async def create_student(
    payload: StudentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_session),
) -> StudentOut:
    """Create a new student profile, or return existing one if email matches.

    On *first* creation, enqueue a welcome email via FastAPI BackgroundTasks
    (runs AFTER the response is returned, so the student doesn't wait, and a
    mail failure can't block account creation).
    """
    result = await db.execute(
        select(StudentModel).where(StudentModel.email == payload.email)
    )
    existing = result.scalar_one_or_none()
    if existing:
        # Re-login / profile update — DO NOT re-send the welcome email.
        for field, value in payload.model_dump(exclude={"email"}).items():
            if value is not None:
                setattr(existing, field, value)
        existing.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(existing)
        return _to_out(existing)

    student = StudentModel(
        id=uuid.uuid4(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        **payload.model_dump(),
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)

    # Fire-and-forget welcome email. send_welcome_email() swallows exceptions
    # and no-ops if SMTP isn't configured, so this is always safe.
    background_tasks.add_task(
        send_welcome_email,
        to=student.email,
        full_name=student.full_name or "",
    )

    return _to_out(student)


@router.post("/{student_id}/request-call", response_model=StudentOut)
async def request_call(
    student_id: str,
    payload: CallRequest,
    db: AsyncSession = Depends(get_session),
) -> StudentOut:
    """Student grants consent for an Abroadly counselor to call them.
    Records consent (and phone if newly provided). AI keeps answering."""
    try:
        sid = uuid.UUID(student_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_student_id")

    result = await db.execute(select(StudentModel).where(StudentModel.id == sid))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="student_not_found")

    student.call_consent = True
    if payload.phone and not student.phone:
        student.phone = payload.phone
    student.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(student)
    return _to_out(student)


@router.get("/{student_id}", response_model=StudentOut)
async def get_student(
    student_id: str,
    db: AsyncSession = Depends(get_session),
) -> StudentOut:
    try:
        sid = uuid.UUID(student_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_student_id")

    result = await db.execute(select(StudentModel).where(StudentModel.id == sid))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="student_not_found")
    return _to_out(student)


@router.put("/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: str,
    payload: StudentUpdate,
    db: AsyncSession = Depends(get_session),
) -> StudentOut:
    try:
        sid = uuid.UUID(student_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_student_id")

    result = await db.execute(select(StudentModel).where(StudentModel.id == sid))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="student_not_found")

    updates = payload.model_dump(exclude_unset=True)
    if "phone" in updates:
        phone = (updates["phone"] or "").strip()
        if not phone:
            raise HTTPException(status_code=422, detail="phone_required")
        updates["phone"] = phone

    for field, value in updates.items():
        setattr(student, field, value)
    student.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(student)
    return _to_out(student)
