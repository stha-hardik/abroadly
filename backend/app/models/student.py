"""Student + ChatTurn schemas (pydantic) + SQLAlchemy ORM models."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import Boolean, Column, Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import DeclarativeBase

EducationLevel = Literal["plus_two", "a_levels", "bba", "bachelors", "other"]
ChatRole = Literal["user", "assistant", "counselor"]


# ---------------------------------------------------------------------------
# SQLAlchemy ORM
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


class StudentModel(Base):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(120), nullable=False)
    email = Column(String, nullable=False, unique=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    education_level = Column(String, nullable=False)
    gpa = Column(Float, nullable=True)
    target_countries = Column(JSONB, nullable=False, default=list)
    preferred_field = Column(String, nullable=True)
    goals = Column(Text, nullable=True)
    ai_paused = Column(Boolean, default=False, server_default="false")
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)


class ChatTurnModel(Base):
    __tablename__ = "chat_turns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    role = Column(String(16), nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    eval_decision = Column(String(32), nullable=True)  # null for user turns
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("ix_chat_turns_student_created", "student_id", "created_at"),
    )


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class StudentBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    phone: str | None = None
    location: str | None = Field(None, description="City / district in Nepal")
    education_level: EducationLevel
    gpa: float | None = Field(None, ge=0, le=4.5)
    target_countries: list[str] = Field(default_factory=list)
    goals: str | None = Field(None, max_length=2000)
    preferred_field: str | None = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    location: str | None = None
    education_level: EducationLevel | None = None
    gpa: float | None = Field(None, ge=0, le=4.5)
    target_countries: list[str] | None = None
    goals: str | None = None
    preferred_field: str | None = None


class StudentOut(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ai_paused: bool = False
    created_at: datetime
    updated_at: datetime


class ChatTurnOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: ChatRole
    content: str
    eval_decision: str | None = None
    created_at: datetime
