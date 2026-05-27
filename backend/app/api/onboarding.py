"""Student onboarding endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.student import StudentCreate, StudentModel, StudentOut, StudentUpdate

router = APIRouter()


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
    db: AsyncSession = Depends(get_session),
) -> StudentOut:
    """Create a new student profile, or return existing one if email matches."""
    result = await db.execute(
        select(StudentModel).where(StudentModel.email == payload.email)
    )
    existing = result.scalar_one_or_none()
    if existing:
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

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(student, field, value)
    student.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(student)
    return _to_out(student)
