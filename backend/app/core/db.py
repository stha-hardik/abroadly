"""Postgres (async SQLAlchemy) + Chroma client singletons."""
from __future__ import annotations

from typing import AsyncGenerator

import chromadb
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# --- Postgres ---------------------------------------------------------------
engine = create_async_engine(settings.postgres_url, pool_pre_ping=True)
SessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine, expire_on_commit=False
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency. Yields an async SQLAlchemy session."""
    async with SessionLocal() as session:
        yield session


# --- Chroma -----------------------------------------------------------------
_chroma_collection: chromadb.Collection | None = None


def get_chroma() -> chromadb.Collection:
    """Return the Chroma collection. Lazy-init, process-wide singleton."""
    global _chroma_collection
    if _chroma_collection is None:
        client = chromadb.PersistentClient(path=settings.chroma_dir)
        _chroma_collection = client.get_or_create_collection(
            name=settings.chroma_collection,
            metadata={"hnsw:space": "l2"},
        )
    return _chroma_collection


# --- Table creation ---------------------------------------------------------
_CREATE_STUDENTS = """
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    location TEXT,
    education_level TEXT NOT NULL,
    gpa FLOAT,
    target_countries JSONB DEFAULT '[]',
    preferred_field TEXT,
    goals TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
"""

_CREATE_CHAT_AUDIT = """
CREATE TABLE IF NOT EXISTS chat_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT NOT NULL,
    trace_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    query TEXT NOT NULL,
    chunk_ids JSONB DEFAULT '[]',
    retrieval_scores JSONB DEFAULT '[]',
    eval_decision TEXT NOT NULL,
    eval_confidence FLOAT,
    model_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

_CREATE_CHAT_TURNS = """
CREATE TABLE IF NOT EXISTS chat_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    eval_decision TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

_CREATE_CHAT_TURNS_INDEX = """
CREATE INDEX IF NOT EXISTS ix_chat_turns_student_created
    ON chat_turns (student_id, created_at);
"""


async def create_tables() -> None:
    """Create all application tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.execute(text(_CREATE_STUDENTS))
        await conn.execute(text(_CREATE_CHAT_AUDIT))
        await conn.execute(text(_CREATE_CHAT_TURNS))
        await conn.execute(text(_CREATE_CHAT_TURNS_INDEX))
