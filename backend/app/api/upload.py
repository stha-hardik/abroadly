"""Document upload endpoint — OCR + ingest into student-scoped Chroma namespace."""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

router = APIRouter()


class UploadResponse(BaseModel):
    doc_id: str
    char_count: int
    chunks: int
    status: str


@router.post("", response_model=UploadResponse)
async def upload(
    student_id: str = Form(...),
    file: UploadFile = File(...),
) -> UploadResponse:
    """Accept transcript / certificate / results doc. PDF or image.

    Pipeline (Phase 2):
      1. Persist file to UPLOAD_DIR/<student_id>/<uuid>.<ext>
      2. Extract text via app.rag.ocr.extract(path)
      3. Chunk + embed + write to Chroma with metadata {student_id, doc_id, kind='student'}
      4. Return doc_id + char_count + chunks
    """
    # TODO Phase 2
    raise HTTPException(status_code=501, detail="not_implemented")
