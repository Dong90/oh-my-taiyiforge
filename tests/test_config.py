"""Tests for config/settings module."""
from app.config.settings import Settings


class TestSettings:
    def test_default_values(self):
        s = Settings()
        assert s.debug is False
        assert s.host == "0.0.0.0"
        assert s.port == 8000
        assert s.llm_model == "gpt-4o-mini"
        assert s.log_level == "INFO"

    def test_env_prefix(self):
        s = Settings(_env_file=None)
        assert s.openai_api_key == ""

    def test_custom_values(self, monkeypatch):
        monkeypatch.setenv("TAIYI_DEBUG", "true")
        monkeypatch.setenv("TAIYI_PORT", "9000")
        monkeypatch.setenv("TAIYI_LLM_MODEL", "gpt-4")
        s = Settings()
        assert s.debug is True
        assert s.port == 9000
        assert s.llm_model == "gpt-4"
