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
    eval_min_retrieval_score: float = 0.55
    eval_min_grounding_score: float = 0.60
    eval_scope_strict: bool = True

    # Uploads
    upload_dir: str = "./uploads"
    max_upload_mb: int = 15

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
