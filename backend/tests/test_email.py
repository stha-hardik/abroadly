"""Tests for the welcome-email pipeline.

We mock `aiosmtplib.send` so the suite never touches the real SMTP server.
Covers: template rendering, send_email skip-when-unconfigured, send_welcome_email
end-to-end, exception swallowing.
"""
from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from app.core import email as email_module
from app.core.email import _first_name, _render, send_email, send_welcome_email


def _run(coro):
    # Each test gets a fresh event loop (Python 3.14 deprecated module-level
    # get_event_loop() in MainThread).
    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------
def test_render_substitutes_double_brace_placeholders():
    out = _render("Hi {{ name }}, see {{ url }}", name="Asha", url="https://x.test")
    assert out == "Hi Asha, see https://x.test"


def test_render_leaves_unrelated_braces_alone():
    css = "body { color: red } Hi {{ name }}"
    assert _render(css, name="Asha") == "body { color: red } Hi Asha"


def test_first_name_from_full_name():
    assert _first_name("Asha Sharma") == "Asha"
    assert _first_name("  Asha   Sharma  ") == "Asha"
    assert _first_name("Asha") == "Asha"


def test_first_name_falls_back_for_empty():
    assert _first_name("") == "there"
    assert _first_name("   ") == "there"


# ---------------------------------------------------------------------------
# send_email — config gating
# ---------------------------------------------------------------------------
def test_send_email_skips_when_smtp_password_unset():
    """In dev with no SMTP_PASSWORD, we don't try to send and don't raise.
    Other SMTP fields can have defaults; password is the only one we gate on."""
    with patch.object(email_module.settings, "smtp_password", ""):
        with patch("app.core.email.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            result = _run(send_email(to="s@example.com", subject="x", html="<p>x</p>", text="x"))
    assert result is False
    mock_send.assert_not_called()


def test_send_email_calls_aiosmtplib_when_configured():
    with patch.object(email_module.settings, "smtp_password", "secret"), \
         patch.object(email_module.settings, "email_from_address", "hello@abroadly.online"), \
         patch.object(email_module.settings, "smtp_host", "smtp.test"), \
         patch.object(email_module.settings, "smtp_port", 587), \
         patch.object(email_module.settings, "smtp_username", "hello@abroadly.online"), \
         patch.object(email_module.settings, "email_from_name", "Abroadly"):
        with patch("app.core.email.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            result = _run(send_email(
                to="s@example.com",
                subject="hello",
                html="<p>hi</p>",
                text="hi",
            ))

    assert result is True
    mock_send.assert_awaited_once()
    # Inspect the message object passed to aiosmtplib.send.
    msg = mock_send.await_args.args[0]
    assert msg["To"] == "s@example.com"
    assert msg["Subject"] == "hello"
    assert "Abroadly" in msg["From"]
    assert "hello@abroadly.online" in msg["From"]


def test_send_email_swallows_smtp_exceptions():
    """An SMTP error must NEVER propagate — it would block the request path."""
    with patch.object(email_module.settings, "smtp_password", "secret"), \
         patch.object(email_module.settings, "email_from_address", "hello@abroadly.online"):
        with patch(
            "app.core.email.aiosmtplib.send",
            new_callable=AsyncMock,
            side_effect=RuntimeError("simulated SMTP outage"),
        ):
            result = _run(send_email(
                to="s@example.com",
                subject="x",
                html="<p>x</p>",
                text="x",
            ))
    assert result is False


# ---------------------------------------------------------------------------
# send_welcome_email — full pipeline with mocked SMTP
# ---------------------------------------------------------------------------
def test_send_welcome_email_renders_first_name_and_urls():
    captured: dict = {}

    async def fake_send(*args, **kwargs):
        captured["msg"] = args[0]
        captured["kwargs"] = kwargs

    with patch.object(email_module.settings, "smtp_password", "secret"), \
         patch.object(email_module.settings, "email_from_address", "hello@abroadly.online"), \
         patch.object(email_module.settings, "public_site_url", "https://abroadly.online"), \
         patch("app.core.email.aiosmtplib.send", new=fake_send):
        result = _run(send_welcome_email(to="s@example.com", full_name="Asha Sharma"))

    assert result is True
    msg = captured["msg"]
    assert msg["To"] == "s@example.com"
    assert msg["Subject"] == "Welcome to Abroadly, Asha"

    # Email has both text/plain and text/html alternatives.
    parts = list(msg.iter_parts())
    text_part = next(p for p in parts if p.get_content_type() == "text/plain")
    html_part = next(p for p in parts if p.get_content_type() == "text/html")
    text_body = text_part.get_content()
    html_body = html_part.get_content()

    # First-name substitution worked everywhere.
    assert "Hey Asha" in text_body
    assert "Asha" in html_body
    # URL substitution worked.
    assert "https://abroadly.online/chat" in text_body
    assert "https://abroadly.online/chat" in html_body
    assert "https://abroadly.online/privacy" in text_body
    assert "https://abroadly.online/terms" in text_body
    # No stale placeholders left.
    assert "{{ first_name }}" not in text_body
    assert "{{ first_name }}" not in html_body


def test_send_welcome_email_empty_name_uses_fallback():
    captured: dict = {}

    async def fake_send(*args, **kwargs):
        captured["msg"] = args[0]

    with patch.object(email_module.settings, "smtp_password", "secret"), \
         patch.object(email_module.settings, "email_from_address", "hello@abroadly.online"), \
         patch("app.core.email.aiosmtplib.send", new=fake_send):
        result = _run(send_welcome_email(to="s@example.com", full_name=""))

    assert result is True
    assert captured["msg"]["Subject"] == "Welcome to Abroadly, there"
