"""Document upload endpoint — parse + ingest into student-scoped Chroma namespace."""
from __future__ import annotations

import io
import uuid
from datetime import datetime
from pathlib import Path

import google.generativeai as genai
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.db import get_chroma

router = APIRouter()

_EMBEDDING_MODEL = "models/gemini-embedding-001"
_CHUNK_WORDS = 300
_OVERLAP_WORDS = 40
_ALLOWED_EXT = {".pdf", ".txt", ".jpg", ".jpeg", ".png"}
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
_MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
}


class StudentDocument(BaseModel):
    filename: str
    doc_id: str
    doc_type: str
    ext: str
    is_image: bool
    size_bytes: int
    uploaded_at: str


class UploadResponse(BaseModel):
    filename: str
    message: str
    document: StudentDocument | None = None


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def _extract_text_txt(data: bytes) -> str:
    return data.decode("utf-8", errors="replace")


def _extract_text_image(data: bytes) -> str:
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(io.BytesIO(data))
        text = pytesseract.image_to_string(img)
        return text
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Image OCR error: {exc}") from exc


def _ocr_pdf(data: bytes) -> str:
    """OCR a scanned PDF (no embedded text) by rasterising pages with PyMuPDF
    and running tesseract on each. Open-source, no paid API. Best-effort:
    returns '' if PyMuPDF/tesseract are unavailable rather than raising."""
    try:
        import fitz  # PyMuPDF
        import pytesseract
        from PIL import Image
    except Exception:
        return ""
    out: list[str] = []
    try:
        doc = fitz.open(stream=data, filetype="pdf")
        # Cap pages so a huge scan can't hang the request.
        for page in doc[:15]:
            pix = page.get_pixmap(dpi=200)
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            out.append(pytesseract.image_to_string(img))
        doc.close()
    except Exception:
        return "\n".join(out)
    return "\n".join(out)


def _extract_text_pdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        pages = [p.extract_text() or "" for p in reader.pages]
        text = "\n".join(pages)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF parse error: {exc}") from exc

    # Scanned PDFs have no text layer — pypdf returns near-nothing. Fall back
    # to open-source OCR (PyMuPDF rasterise + tesseract).
    if len(text.strip()) < 20:
        ocr_text = _ocr_pdf(data)
        if len(ocr_text.strip()) > len(text.strip()):
            return ocr_text
    return text


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
# Stored document listing
# ---------------------------------------------------------------------------

def _document_item_from_file(path: Path) -> StudentDocument:
    doc_id = path.stem
    ext = path.suffix.lower()
    title = path.name
    doc_type = "other"

    try:
        collection = get_chroma()
        results = collection.get(where={"doc_id": doc_id}, limit=1, include=["metadatas"])
        metas = results.get("metadatas") if results else None
        if metas and len(metas) > 0:
            title = metas[0].get("title", path.name) or path.name
            doc_type = metas[0].get("doc_type", "other") or "other"
    except Exception:
        pass

    stat = path.stat()
    return StudentDocument(
        filename=title,
        doc_id=doc_id,
        doc_type=doc_type,
        ext=ext,
        is_image=ext in _IMAGE_EXTS,
        size_bytes=stat.st_size,
        uploaded_at=datetime.fromtimestamp(stat.st_mtime).isoformat(),
    )


def _list_student_documents(student_id: str) -> list[StudentDocument]:
    doc_dir = Path(settings.upload_dir) / student_id
    if not doc_dir.exists():
        return []

    return [
        _document_item_from_file(path)
        for path in sorted(doc_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
        if path.is_file()
    ]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("", response_model=UploadResponse)
async def upload(
    student_id: str = Form(...),
    file: UploadFile = File(...),
    doc_type: str = Form("other"),
    display_filename: str | None = Form(None),
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
    uploaded_filename = file.filename or "document"
    filename = display_filename or uploaded_filename
    ext = Path(uploaded_filename).suffix.lower()
    if ext not in _ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Upload PDF or TXT.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")

    # Extract text
    if ext == ".txt":
        text = _extract_text_txt(data)
    elif ext in (".jpg", ".jpeg", ".png"):
        text = _extract_text_image(data)
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
            "doc_type": doc_type or "other",
        })

    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )

    # Optionally persist file to upload dir (best-effort)
    stored_document: StudentDocument | None = None
    try:
        dest_dir = Path(settings.upload_dir) / student_id
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / f"{doc_id}{ext}"
        dest_path.write_bytes(data)
        stored_document = _document_item_from_file(dest_path)
    except Exception:
        pass  # Storage failure doesn't break the response

    return UploadResponse(
        filename=filename,
        message=f"Uploaded and indexed {len(chunks)} chunks from {filename}.",
        document=stored_document,
    )


@router.get("/{student_id}/documents", response_model=list[StudentDocument])
async def list_documents(student_id: str) -> list[StudentDocument]:
    return _list_student_documents(student_id)


@router.get("/{student_id}/documents/{doc_id}/download")
async def download_document(student_id: str, doc_id: str):
    doc_dir = Path(settings.upload_dir) / student_id
    if doc_dir.exists():
        for path in doc_dir.iterdir():
            if path.stem == doc_id and path.is_file():
                media_type = _MIME_TYPES.get(path.suffix.lower(), "application/octet-stream")
                return FileResponse(
                    str(path),
                    media_type=media_type,
                    headers={"Content-Disposition": f'inline; filename="{path.name}"'},
                )
    raise HTTPException(status_code=404, detail="Document not found")
