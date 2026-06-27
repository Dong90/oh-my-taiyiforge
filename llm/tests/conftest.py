"""测试配置"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock


@pytest.fixture
def client():
    """创建测试客户端"""
    from main import app
    return TestClient(app)


@pytest.fixture
def mock_llm_service():
    """Mock LLM 服务"""
    svc = AsyncMock()
    svc.translate = AsyncMock(return_value="Mock translation result")
    svc.translate_stream = AsyncMock()
    return svc


@pytest.fixture
def mock_translation_service(mock_llm_service):
    """Mock 翻译服务"""
    from app.services.translation_service import TranslationService
    svc = TranslationService(mock_llm_service)
    svc.translate = AsyncMock(return_value="Mock translation result")
    svc.translate_stream = AsyncMock()
    return svc
