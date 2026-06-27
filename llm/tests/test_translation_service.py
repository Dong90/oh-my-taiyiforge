"""翻译服务测试"""
import pytest
from unittest.mock import AsyncMock


class TestTranslationService:
    """翻译服务测试"""

    @pytest.mark.asyncio
    async def test_translate_success(self):
        from app.services.translation_service import TranslationService
        mock_llm = AsyncMock()
        mock_llm.translate = AsyncMock(return_value="翻译结果")
        svc = TranslationService(mock_llm)
        result = await svc.translate("hello", "dev_to_product")
        assert result == "翻译结果"

    @pytest.mark.asyncio
    async def test_translate_empty_text(self):
        from app.services.translation_service import TranslationService
        from app.core.exceptions import ValidationException
        mock_llm = AsyncMock()
        svc = TranslationService(mock_llm)
        with pytest.raises(ValidationException, match="Text cannot be empty"):
            await svc.translate("", "dev_to_product")

    @pytest.mark.asyncio
    async def test_translate_invalid_direction(self):
        from app.services.translation_service import TranslationService
        from app.core.exceptions import TranslationException
        mock_llm = AsyncMock()
        svc = TranslationService(mock_llm)
        with pytest.raises(TranslationException, match="Unknown direction"):
            await svc.translate("hello", "invalid")
