"""Student authentication endpoints.

Google OAuth runs server-side here so the client secret never reaches the
Next.js bundle or browser.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.models.student import EducationLevel, StudentModel, StudentOut

try:
    import jwt
except ImportError:
    from jose import jwt  # type: ignore[no-redef]

router = APIRouter()

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
_STATE_COOKIE = "abroadly_google_oauth_state"
_SESSION_COOKIE = "abroadly_student_session"
_OAUTH_TIMEOUT = 15.0
_SESSION_DAYS = 30
_JWT_ALGORITHM = "HS256"


class GoogleExchangeRequest(BaseModel):
    code: str
    state: str


class GoogleAuthResponse(BaseModel):
    student: StudentOut
    is_new_student: bool


class CompleteProfileRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)
    phone: str | None = Field(None, max_length=40)
    location: str | None = Field(None, max_length=120)
    education_level: EducationLevel
    gpa: float | None = Field(None, ge=0, le=4.5)
    expected_gpa: float | None = Field(None, ge=0, le=4.5)
    target_countries: list[str] = Field(..., min_length=1, max_length=12)
    goals: str | None = Field(None, max_length=2000)
    preferred_field: str | None = Field(None, max_length=120)


def _google_configured() -> bool:
    return bool(settings.google_oauth_client_id and settings.google_oauth_client_secret)


def _student_to_out(model: StudentModel) -> StudentOut:
    return StudentOut.model_validate(
        {
            **{c.name: getattr(model, c.name) for c in model.__table__.columns},
            "id": str(model.id),
        }
    )


def _google_authorize_url(state: str) -> str:
    params = {
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    return f"{_GOOGLE_AUTH_URL}?{urlencode(params)}"


def _cookie_secure() -> bool:
    return settings.app_env == "production"


def _create_student_session_token(student_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": student_id,
        "typ": "student",
        "iat": now,
        "exp": now + timedelta(days=_SESSION_DAYS),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_JWT_ALGORITHM)


def _decode_student_session_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[_JWT_ALGORITHM])
        if payload.get("typ") != "student":
            raise ValueError("wrong token type")
        return str(payload["sub"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_student_session",
        )


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _clean_countries(countries: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for country in countries:
        value = country.strip()
        key = value.lower()
        if value and key not in seen:
            cleaned.append(value[:80])
            seen.add(key)
    if not cleaned:
        raise HTTPException(status_code=422, detail="target_countries_required")
    return cleaned


async def _fetch_google_profile(code: str) -> dict:
    async with httpx.AsyncClient(timeout=_OAUTH_TIMEOUT) as client:
        token_resp = await client.post(
            _GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.google_oauth_redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="google_token_exchange_failed")

        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="google_access_token_missing")

        profile_resp = await client.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        )
        if profile_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="google_profile_fetch_failed")
        return profile_resp.json()


async def _upsert_google_student(db: AsyncSession, profile: dict) -> tuple[StudentModel, bool]:
    email = (profile.get("email") or "").strip().lower()
    email_verified = profile.get("email_verified")
    if not email or email_verified is not True:
        raise HTTPException(status_code=400, detail="google_email_not_verified")

    full_name = (profile.get("name") or email.split("@")[0]).strip()[:120]
    result = await db.execute(select(StudentModel).where(StudentModel.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        if not existing.full_name:
            existing.full_name = full_name
        existing.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(existing)
        return existing, False

    student = StudentModel(
        id=uuid.uuid4(),
        full_name=full_name,
        email=email,
        education_level="other",
        target_countries=[],
        profile_completed=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student, True


async def get_current_student(
    student_session: str | None = Cookie(None, alias=_SESSION_COOKIE),
    db: AsyncSession = Depends(get_session),
) -> StudentModel:
    if not student_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="student_session_required",
        )

    student_id = _decode_student_session_token(student_session)
    try:
        sid = uuid.UUID(student_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_student_session",
        )

    result = await db.execute(select(StudentModel).where(StudentModel.id == sid))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="student_not_found")
    return student


@router.get("/google/login")
async def google_login() -> RedirectResponse:
    if not _google_configured():
        raise HTTPException(status_code=503, detail="google_oauth_not_configured")

    state = secrets.token_urlsafe(32)
    response = RedirectResponse(_google_authorize_url(state), status_code=302)
    response.set_cookie(
        _STATE_COOKIE,
        state,
        max_age=600,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        path="/",
    )
    return response


@router.post("/google/exchange", response_model=GoogleAuthResponse)
async def google_exchange(
    req: GoogleExchangeRequest,
    oauth_state: str | None = Cookie(None, alias=_STATE_COOKIE),
    db: AsyncSession = Depends(get_session),
) -> JSONResponse:
    if not _google_configured():
        raise HTTPException(status_code=503, detail="google_oauth_not_configured")
    if not oauth_state or not secrets.compare_digest(oauth_state, req.state):
        raise HTTPException(status_code=400, detail="invalid_oauth_state")

    profile = await _fetch_google_profile(req.code)
    student, is_new = await _upsert_google_student(db, profile)
    payload = GoogleAuthResponse(student=_student_to_out(student), is_new_student=is_new)

    response = JSONResponse(payload.model_dump(mode="json"))
    response.set_cookie(
        _SESSION_COOKIE,
        _create_student_session_token(str(student.id)),
        max_age=_SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        path="/",
    )
    response.delete_cookie(_STATE_COOKIE, path="/")
    return response


@router.get("/me", response_model=StudentOut)
async def me(student: StudentModel = Depends(get_current_student)) -> StudentOut:
    return _student_to_out(student)


@router.put("/profile", response_model=StudentOut)
async def complete_profile(
    req: CompleteProfileRequest,
    student: StudentModel = Depends(get_current_student),
    db: AsyncSession = Depends(get_session),
) -> StudentOut:
    student.full_name = req.full_name.strip()
    student.phone = _clean_text(req.phone)
    student.location = _clean_text(req.location)
    student.education_level = req.education_level
    student.gpa = req.gpa
    student.expected_gpa = req.expected_gpa
    student.target_countries = _clean_countries(req.target_countries)
    student.preferred_field = _clean_text(req.preferred_field)
    student.goals = _clean_text(req.goals)
    student.profile_completed = True
    student.updated_at = datetime.utcnow()

    db.add(student)
    await db.commit()
    await db.refresh(student)
    return _student_to_out(student)


@router.post("/logout")
async def logout() -> JSONResponse:
    response = JSONResponse({"ok": True})
    response.delete_cookie(_SESSION_COOKIE, path="/")
    return response
