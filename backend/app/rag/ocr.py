"""Document text extraction.

PDF -> pypdf (text-based PDFs). Scanned PDFs + images -> pytesseract.
"""
from __future__ import annotations

from pathlib import Path


def extract(path: str | Path) -> str:
    """Return plain text from PDF or image. Raises ValueError on unsupported types.

    TODO Phase 2:
      ext = Path(path).suffix.lower()
      if ext == ".pdf":
          return _extract_pdf(path)
      if ext in {".png", ".jpg", ".jpeg", ".tiff", ".bmp"}:
          return _extract_image(path)
      raise ValueError(f"unsupported_format:{ext}")
    """
    raise NotImplementedError


def _extract_pdf(path: str | Path) -> str:
    # from pypdf import PdfReader
    # reader = PdfReader(str(path))
    # return "\n".join((p.extract_text() or "") for p in reader.pages)
    raise NotImplementedError


def _extract_image(path: str | Path) -> str:
    # import pytesseract
    # from PIL import Image
    # return pytesseract.image_to_string(Image.open(path))
    raise NotImplementedError
