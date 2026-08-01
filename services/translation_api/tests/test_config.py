"""Tests for application configuration."""
from __future__ import annotations

import pytest

from services.translation_api.config import ConfigError, Settings


class TestSettings:
    """Settings loading and validation."""

    def test_missing_api_key_raises(self):
        """Given OPENAI_API_KEY is empty, validate_required raises ConfigError."""
        s = Settings(OPENAI_API_KEY="")
        with pytest.raises(ConfigError, match="OPENAI_API_KEY"):
            s.validate_required()

    def test_default_values(self):
        """Given no env overrides, defaults are applied."""
        s = Settings(OPENAI_API_KEY="sk-test")
        assert s.APP_HOST == "0.0.0.0"
        assert s.APP_PORT == 8000
        assert s.OPENAI_MODEL == "gpt-4o-mini"
        assert s.OPENAI_TEMPERATURE == 0.3

    def test_validate_ok(self):
        """Given all required fields are present, validate succeeds."""
        s = Settings(OPENAI_API_KEY="sk-test")
        # Should not raise
        s.validate_required()

    def test_atlascloud_provider_maps_openai_compatible_settings(self):
        s = Settings(
            LLM_PROVIDER="atlascloud",
            ATLASCLOUD_API_KEY="atlas-test",
        )

        s.validate_required()

        assert s.OPENAI_API_KEY == "atlas-test"
        assert s.OPENAI_BASE_URL == "https://api.atlascloud.ai/v1"
        assert s.OPENAI_MODEL == "deepseek-ai/deepseek-v4-pro"

    def test_atlascloud_provider_requires_atlas_key(self):
        s = Settings(LLM_PROVIDER="atlascloud", ATLASCLOUD_API_KEY="")

        with pytest.raises(ConfigError, match="ATLASCLOUD_API_KEY"):
            s.validate_required()
