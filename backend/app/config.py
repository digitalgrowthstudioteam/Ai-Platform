"""
Digital Growth Studio — AI Ads Optimizer
Configuration module using Pydantic Settings
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_ENV: str = Field(default="development", description="Application environment")
    APP_NAME: str = Field(default="Digital Growth Studio", description="Application name")
    APP_VERSION: str = Field(default="1.0.0", description="Application version")
    DEBUG: bool = Field(default=False, description="Debug mode")

    # Server
    BACKEND_URL: str = Field(default="http://localhost:8000", description="Backend URL")
    FRONTEND_URL: str = Field(default="http://localhost:3000", description="Frontend URL")
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000",
        description="Comma-separated list of allowed CORS origins"
    )

    # Database (Supabase PostgreSQL)
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:password@localhost:5432/digital_growth_studio",
        description="PostgreSQL connection string (asyncpg)"
    )
    DATABASE_POOL_SIZE: int = Field(default=20, description="Database connection pool size")
    DATABASE_MAX_OVERFLOW: int = Field(default=10, description="Max pool overflow connections")

    # Firebase
    FIREBASE_PROJECT_ID: str = Field(default="digital-growth-studio", description="Firebase project ID")
    FIREBASE_PRIVATE_KEY_PATH: Optional[str] = Field(
        default=None,
        description="Path to Firebase Admin SDK service account JSON"
    )

    # Meta API (Phase 4)
    META_APP_ID: Optional[str] = Field(default=None, description="Meta/Facebook App ID")
    META_APP_SECRET: Optional[str] = Field(default=None, description="Meta/Facebook App Secret")
    META_REDIRECT_URI: Optional[str] = Field(default=None, description="Meta OAuth redirect URI")
    META_API_VERSION: str = Field(default="v21.0", description="Meta API version")

    # Encryption (for Meta tokens)
    ENCRYPTION_KEY: Optional[str] = Field(default=None, description="Fernet encryption key for token storage")

    # Redis (for Celery)
    REDIS_URL: str = Field(default="redis://localhost:6379/0", description="Redis URL for Celery broker")

    # Razorpay (Phase 9)
    RAZORPAY_KEY_ID: Optional[str] = Field(default=None, description="Razorpay API Key ID")
    RAZORPAY_KEY_SECRET: Optional[str] = Field(default=None, description="Razorpay API Key Secret")

    # AI (Phase 8)
    AI_API_KEY: Optional[str] = Field(default=None, description="AI/LLM API Key")
    AI_MODEL: str = Field(default="gpt-4o-mini", description="AI model to use")
    GEMINI_MODEL: str = Field(default="gemini-3.6-flash", description="Gemini model to use for assistant and analysis")

    # Sync
    SYNC_COOLDOWN_MINUTES: int = Field(default=15, description="Minimum minutes between manual syncs")
    INITIAL_SYNC_DAYS: int = Field(default=365, description="Days of historical data for initial sync")

    @property
    def cors_origins(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        origins = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
        defaults = [
            "https://digitalgrowthstudio.in",
            "https://www.digitalgrowthstudio.in",
            "https://digital-growth-studio.web.app",
            "https://digital-growth-studio.firebaseapp.com",
            "https://digital-growth-studio-api.onrender.com",
            "http://localhost:3000",
            "http://localhost:8000",
        ]
        for d in defaults:
            if d not in origins:
                origins.append(d)
        return origins

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
