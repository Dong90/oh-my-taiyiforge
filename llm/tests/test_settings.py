"""配置管理测试"""
import pytest
from pydantic import ValidationError
from app.config.settings import Settings


class TestSettings:
    """配置管理测试"""

    def test_default_values(self):
        """测试默认值"""
        settings = Settings(openai_api_key="sk-test")
        assert settings.openai_api_key == "sk-test"
        assert settings.openai_model == "gpt-4"
        assert settings.openai_api_base_url == "https://s.lconai.com/v1"
        assert settings.port == 8000
        assert settings.host == "0.0.0.0"

    def test_cors_origins_wildcard(self):
        """测试 CORS 通配符"""
        settings = Settings(openai_api_key="sk-test", cors_origins=["*"])
        assert settings.get_cors_origins() == ["*"]

    def test_cors_origins_specific(self):
        """测试具体 CORS 来源"""
        settings = Settings(
            openai_api_key="sk-test",
            cors_origins=["http://localhost:3000"],
        )
        assert settings.get_cors_origins() == ["http://localhost:3000"]

    def test_custom_values(self):
        """测试自定义值覆盖"""
        settings = Settings(
            openai_api_key="sk-custom",
            openai_api_base_url="https://custom.api.com/v1",
            openai_model="gpt-4o",
            port=9000,
            debug=True,
        )
        assert settings.openai_api_key == "sk-custom"
        assert settings.openai_api_base_url == "https://custom.api.com/v1"
        assert settings.openai_model == "gpt-4o"
        assert settings.port == 9000
        assert settings.debug is True
