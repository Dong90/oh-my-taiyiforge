"""Tests for LLMService and TranslationService."""
from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from services.translation_api.models.schemas import TranslateRequest
from services.translation_api.services import LLMService, TranslationService


class TestLLMService:
    """LLMService wraps the adapter with retries."""

    @pytest.mark.asyncio
    async def test_translate_returns_adapter_result(self, mock_adapter: AsyncMock, llm_service: LLMService):
        """Given a mock adapter, translate() returns its output."""
        result = await llm_service.translate(
            [{"role": "user", "content": "hello"}]
        )
        assert result == "translated text"
        mock_adapter.chat_completion.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_translate_retries_on_failure(self):
        """Given the adapter fails once, LLMService retries."""
        adapter = AsyncMock()
        adapter.chat_completion = AsyncMock(side_effect=[ValueError("temp"), "ok"])

        svc = LLMService(adapter=adapter, max_retries=1)
        result = await svc.translate([{"role": "user", "content": "hi"}])
        assert result == "ok"
        assert adapter.chat_completion.await_count == 2

    @pytest.mark.asyncio
    async def test_translate_raises_after_max_retries(self):
        """Given the adapter keeps failing, translate() raises."""
        adapter = AsyncMock()
        adapter.chat_completion = AsyncMock(side_effect=ValueError("always fails"))

        svc = LLMService(adapter=adapter, max_retries=1)
        with pytest.raises(ValueError, match="always fails"):
            await svc.translate([{"role": "user", "content": "hi"}])


class TestTranslationService:
    """TranslationService routes directions to correct strategies."""

    @pytest.mark.asyncio
    async def test_translate_dev_to_product(self, translation_service: TranslationService):
        """Given a valid request, translate() returns a TranslateResponse."""
        req = TranslateRequest(text="API refactoring needed", from_role="dev", to_role="product")
        resp = await translation_service.translate(req)
        assert resp.translated_text
        assert resp.source_role == "dev"
        assert resp.target_role == "product"

    def test_translate_unknown_direction(self, translation_service: TranslationService):
        """Given an invalid role pair, constructing request raises ValidationError."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError, match="Invalid role"):
            TranslateRequest(text="hello", from_role="dev", to_role="unknown")

    @pytest.mark.asyncio
    async def test_translate_stream(self, translation_service: TranslationService):
        """translate_stream yields tokens."""
        req = TranslateRequest(text="hello", from_role="dev", to_role="product")
        tokens = []
        async for token in translation_service.translate_stream(req):
            tokens.append(token)
        assert len(tokens) > 0
