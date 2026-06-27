"""Application settings via pydantic-settings."""

from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # OpenAI
    openai_api_key: str = ""
    openai_api_base_url: str = "https://s.lconai.com/v1"
    openai_model: str = "gpt-4"

    # App
    app_name: str = "Translation Assistant"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    log_format: str = "json"
    cors_origins: str = "*"

    @property
    def effective_api_key(self) -> str:
        """Return the effective API key, checking env first."""
        key = self.openai_api_key or os.environ.get("OPENAI_API_KEY", "")
        if key.startswith("test-key"):
            return "sk-test-placeholder"
        return key

    @property
    def is_test(self) -> bool:
        return self.environment == "test"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
