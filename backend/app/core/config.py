"""Settings — loaded from .env via pydantic-settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    groq_api_key: str = ""
    gemini_api_key: str = ""

    # Chroma
    chroma_dir: str = "./chroma_db"
    chroma_collection: str = "abroadly_knowledge"

    # Postgres
    postgres_url: str = "postgresql+asyncpg://abroadly:abroadly@localhost:5432/abroadly"

    # App
    app_env: str = "dev"
    app_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    # Eval thresholds
    eval_min_retrieval_score: float = 0.35
    eval_min_grounding_score: float = 0.30
    eval_scope_strict: bool = False

    # Admin
    admin_username: str = "username"
    admin_password_hash: str = ""
    jwt_secret: str = "abroadly-jwt-secret-change-in-prod"

    # Google OAuth student sign-in
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = "https://abroadly.online/auth/google/callback"

    # Global AI toggle (runtime, not persisted across restarts)
    ai_globally_paused: bool = False

    # Uploads
    upload_dir: str = "./uploads"
    max_upload_mb: int = 15

    # Outbound email (transactional only — welcome emails for now).
    # If smtp_password is empty, the email module no-ops silently (dev mode).
    # Defaults assume the live abroadly.online deployment via Hostinger
    # mail; in prod, the only env var that NEEDS to be set is SMTP_PASSWORD.
    # Forks running on a different domain should override SMTP_USERNAME +
    # EMAIL_FROM_ADDRESS.
    smtp_host: str = "smtp.hostinger.com"
    smtp_port: int = 587
    smtp_username: str = "hello@abroadly.online"
    smtp_password: str = ""
    email_from_name: str = "Abroadly"
    email_from_address: str = "hello@abroadly.online"
    # Public URLs included in email copy.
    public_site_url: str = "https://abroadly.online"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def email_enabled(self) -> bool:
        """Email sending runs as soon as SMTP_PASSWORD is set; other SMTP
        fields have sensible defaults for the abroadly.online deployment."""
        return bool(self.smtp_password)


settings = Settings()
