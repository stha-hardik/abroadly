"""Google OAuth student sign-in helpers."""
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi import HTTPException

from app.api import auth
from app.core.config import settings


def test_google_authorize_url_uses_configured_redirect(monkeypatch):
    monkeypatch.setattr(settings, "google_oauth_client_id", "client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "google_oauth_redirect_uri", "https://abroadly.online/auth/google/callback")

    parsed = urlparse(auth._google_authorize_url("state-123"))
    params = parse_qs(parsed.query)

    assert parsed.scheme == "https"
    assert parsed.netloc == "accounts.google.com"
    assert params["client_id"] == ["client-id.apps.googleusercontent.com"]
    assert params["redirect_uri"] == ["https://abroadly.online/auth/google/callback"]
    assert params["response_type"] == ["code"]
    assert params["state"] == ["state-123"]
    assert "openid" in params["scope"][0]
    assert "email" in params["scope"][0]
    assert "profile" in params["scope"][0]


@pytest.mark.asyncio
async def test_google_profile_requires_verified_email():
    with pytest.raises(HTTPException) as exc:
        await auth._upsert_google_student(None, {"email": "student@example.com", "email_verified": False})

    assert exc.value.status_code == 400
    assert exc.value.detail == "google_email_not_verified"
