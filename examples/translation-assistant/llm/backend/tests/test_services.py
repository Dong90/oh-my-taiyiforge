"""Tests for services layer with mocked LLM adapter."""

import pytest
from unittest.mock import AsyncMock, patch

from app.models.request import TranslationRequest
from app.services.translation_service import TranslationService
from app.services.metrics_service import MetricsService
from app.core.exceptions import ValidationException


class MockLLMService:
    """Mock LLM service for testing."""

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        return f"Translated: {user_prompt[:20]}..."

    async def generate_stream(self, system_prompt: str, user_prompt: str):
        yield "chunk1 "
        yield "chunk2"


class TestTranslationService:
    @pytest.fixture
    def service(self):
        metrics = MetricsService()
        llm = MockLLMService()
        return TranslationService(llm=llm, metrics=metrics)

    @pytest.mark.asyncio
    async def test_translate_valid_direction(self, service):
        request = TranslationRequest(text="测试输入", direction="product_to_dev")
        result = await service.translate(request)
        assert result.direction == "product_to_dev"
        assert "Translated" in result.text
        assert result.duration_ms >= 0

    @pytest.mark.asyncio
    async def test_translate_invalid_direction(self, service):
        request = TranslationRequest(text="测试", direction="invalid_direction")
        with pytest.raises(ValidationException) as exc:
            await service.translate(request)
        assert "Unknown direction" in str(exc.value)

    @pytest.mark.asyncio
    async def test_translate_stream(self, service):
        request = TranslationRequest(text="测试", direction="product_to_dev")
        chunks = []
        async for chunk in service.translate_stream(request):
            chunks.append(chunk)
        assert len(chunks) == 2
        assert "".join(chunks) == "chunk1 chunk2"

    @pytest.mark.asyncio
    async def test_metrics_recorded(self, service):
        request = TranslationRequest(text="测试", direction="dev_to_product")
        await service.translate(request)
        stats = service._metrics.get_stats()
        assert stats["total_translations"] >= 1
        assert "dev_to_product" in stats["directions"]


class TestMetricsService:
    @pytest.fixture
    def metrics(self):
        return MetricsService()

    def test_record_and_get_stats(self, metrics):
        metrics.record("product_to_dev", 100.0)
        metrics.record("product_to_dev", 200.0)
        metrics.record("dev_to_product", 150.0)
        stats = metrics.get_stats()
        assert stats["total_translations"] == 3
        assert stats["directions"]["product_to_dev"]["count"] == 2
        assert stats["directions"]["product_to_dev"]["avg_duration_ms"] == 150.0
        assert stats["directions"]["dev_to_product"]["count"] == 1

    def test_reset(self, metrics):
        metrics.record("product_to_dev", 100.0)
        metrics.reset()
        stats = metrics.get_stats()
        assert stats["total_translations"] == 0
