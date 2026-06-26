"""Application configuration via pydantic-settings."""
from __future__ import annotations

import logging
from typing import Final

from pydantic_settings import BaseSettings, SettingsConfigDict


class ConfigError(RuntimeError):
    """Raised when a required configuration value is missing or invalid."""


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    All secrets (OPENAI_API_KEY, etc.) are validated at construction time
    so that misconfigured deployments fail fast on startup rather than at
    first request.
    """

    model_config = SettingsConfigDict(
        env_prefix="",
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
    )

    # ── Server ──────────────────────────────────────────────────────────
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # ── OpenAI ──────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_TIMEOUT_SECONDS: int = 30
    OPENAI_MAX_TOKENS: int = 1024
    OPENAI_TEMPERATURE: float = 0.3

    def validate_required(self) -> None:
        """Check that all required values are present.

        Call during application startup so that misconfiguration is
        detected before the first request arrives.
        """
        missing: list[str] = []
        if not self.OPENAI_API_KEY:
            missing.append("OPENAI_API_KEY")
        if missing:
            msg = f"Missing required environment variables: {', '.join(missing)}"
            raise ConfigError(msg)


def get_settings() -> Settings:
    """Return the cached singleton settings instance."""
    if _INSTANCE is None:
        _init_settings()
    assert _INSTANCE is not None
    return _INSTANCE


_INSTANCE: Settings | None = None


def _init_settings() -> None:
    global _INSTANCE
    s = Settings()
    s.validate_required()
    _INSTANCE = s
    logging.getLogger(__name__).info(
        "Settings loaded; model=%s base_url=%s",
        s.OPENAI_MODEL,
        s.OPENAI_BASE_URL,
    )


# — Convenience constants used throughout the application ——————
DEFAULT_MODEL: Final[str] = "gpt-4o-mini"
DEFAULT_TEMPERATURE: Final[float] = 0.3
DEFAULT_MAX_TOKENS: Final[int] = 1024
