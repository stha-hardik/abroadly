"""Student authentication endpoints.

Google OAuth runs server-side here so the client secret never reaches the
Next.js bundle or browser.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.models.student import StudentModel, StudentOut

router = APIRouter()

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
_STATE_COOKIE = "abroadly_google_oauth_state"
_OAUTH_TIMEOUT = 15.0


class GoogleExchangeRequest(BaseModel):
    code: str
    state: str


class GoogleAuthResponse(BaseModel):
    student: StudentOut
    is_new_student: bool


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
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student, True


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
        secure=settings.app_env == "production",
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
    response.delete_cookie(_STATE_COOKIE, path="/")
    return response
