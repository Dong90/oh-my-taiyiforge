"""翻译控制器测试"""
import pytest
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def override_translation_deps():
    """Override FastAPI Depends so real OpenAI API is never called in tests.

    FastAPI's Depends() holds a direct reference to the function object,
    so @patch cannot intercept it.  We use dependency_overrides instead.
    """
    from app.controllers.translation_controller import get_translation_service

    overrides = {}

    def override_svc(svc=None):
        if svc is not None:
            app.dependency_overrides[get_translation_service] = svc
            overrides["svc"] = svc
        else:
            app.dependency_overrides.pop(get_translation_service, None)
            overrides.pop("svc", None)

    yield override_svc

    for dep in list(app.dependency_overrides):
        app.dependency_overrides.pop(dep, None)


class TestTranslationController:
    """翻译控制器测试"""

    def test_translate_success(self, client, override_translation_deps):
        async def override_get_translation_service():
            svc = AsyncMock()
            svc.translate = AsyncMock(return_value="开发需实现高并发积分大转盘抽奖系统")
            return svc

        override_translation_deps(override_get_translation_service)

        response = client.post(
            "/api/translation/translate",
            json={
                "text": "我们需要一个积分大转盘抽奖功能",
                "direction": "product_to_dev",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "translated_text" in data
        assert data["direction"] == "product_to_dev"

    def test_translate_validation_error(self, client):
        response = client.post(
            "/api/translation/translate",
            json={"text": "", "direction": "invalid"},
        )
        assert response.status_code == 422

    def test_health_endpoint(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_live_endpoint(self, client):
        response = client.get("/live")
        assert response.status_code == 200
        assert response.json()["status"] == "alive"

    def test_ready_endpoint(self, client):
        response = client.get("/ready")
        assert response.status_code == 200
