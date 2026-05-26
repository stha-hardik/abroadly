"""Document upload endpoint — parse + ingest into student-scoped Chroma namespace."""
from __future__ import annotations

import io
import os
import uuid
from pathlib import Path

import google.generativeai as genai
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.config import settings
from app.core.db import get_chroma

router = APIRouter()

_EMBEDDING_MODEL = "models/gemini-embedding-001"
_CHUNK_WORDS = 300
_OVERLAP_WORDS = 40
_ALLOWED_EXT = {".pdf", ".txt"}


class UploadResponse(BaseModel):
    filename: str
    message: str


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def _extract_text_txt(data: bytes) -> str:
    return data.decode("utf-8", errors="replace")


def _extract_text_pdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        pages = [p.extract_text() or "" for p in reader.pages]
        return "\n".join(pages)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF parse error: {exc}") from exc


# ---------------------------------------------------------------------------
# Chunking (word-level sliding window)
# ---------------------------------------------------------------------------

def _chunk(text: str, size: int = _CHUNK_WORDS, overlap: int = _OVERLAP_WORDS) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        start += size - overlap
    return chunks


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

def _embed(text: str) -> list[float]:
    genai.configure(api_key=settings.gemini_api_key)
    result = genai.embed_content(
        model=_EMBEDDING_MODEL,
        content=text,
        task_type="retrieval_document",
    )
    return result["embedding"]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("", response_model=UploadResponse)
async def upload(
    student_id: str = Form(...),
    file: UploadFile = File(...),
) -> UploadResponse:
    """Accept transcript / certificate / results doc. PDF or TXT.

    Pipeline:
      1. Validate extension
      2. Read file bytes
      3. Extract text
      4. Chunk into ~300-word windows with 40-word overlap
      5. Embed each chunk with Gemini (retrieval_document task)
      6. Upsert to Chroma with metadata {kind=student, student_id, source_type=student, title}
      7. Return filename + message
    """
    filename = file.filename or "document"
    ext = Path(filename).suffix.lower()
    if ext not in _ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Upload PDF or TXT.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")

    # Extract text
    if ext == ".txt":
        text = _extract_text_txt(data)
    else:
        text = _extract_text_pdf(data)

    text = text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Could not extract any text from the file.")

    # Chunk
    chunks = _chunk(text)
    if not chunks:
        raise HTTPException(status_code=422, detail="No content found after chunking.")

    # Embed + upsert to Chroma
    collection = get_chroma()
    doc_id = str(uuid.uuid4())
    ids: list[str] = []
    embeddings: list[list[float]] = []
    documents: list[str] = []
    metadatas: list[dict] = []

    for i, chunk_text in enumerate(chunks):
        try:
            emb = _embed(chunk_text)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Embedding failed: {exc}") from exc

        chunk_id = f"{doc_id}-{i}"
        ids.append(chunk_id)
        embeddings.append(emb)
        documents.append(chunk_text)
        metadatas.append({
            "kind": "student",
            "student_id": student_id,
            "doc_id": doc_id,
            "source_type": "student",
            "title": filename,
        })

    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )

    # Optionally persist file to upload dir (best-effort)
    try:
        dest_dir = Path(settings.upload_dir) / student_id
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / f"{doc_id}{ext}"
        dest_path.write_bytes(data)
    except Exception:
        pass  # Storage failure doesn't break the response

    return UploadResponse(
        filename=filename,
        message=f"Uploaded and indexed {len(chunks)} chunks from {filename}.",
    )
