"""Tests for LLM client, service, and prompts."""
from unittest.mock import AsyncMock

import pytest

from app.llm.client import LLMClient, LLMResult
from app.llm.prompts import ROLE_PROMPTS, build_translate_prompt
from app.llm.service import TranslationService


class TestPromptBuilder:
    def test_build_general_prompt(self):
        prompt = build_translate_prompt("Hello", "en", "zh", "general")
        assert "Translate" in prompt
        assert "Hello" in prompt
        assert "en" in prompt
        assert "zh" in prompt

    def test_build_product_prompt(self):
        prompt = build_translate_prompt("Buy now!", "en", "zh", "product")
        assert "marketing" in prompt.lower()

    def test_build_dev_prompt(self):
        prompt = build_translate_prompt("npm install", "en", "zh", "dev")
        assert "technical" in prompt.lower()

    def test_build_ops_prompt(self):
        prompt = build_translate_prompt("compliance", "en", "zh", "ops")
        assert "regulatory" in prompt.lower()

    def test_unknown_role_falls_back(self):
        prompt = build_translate_prompt("Hello", "en", "zh", "unknown_role")
        assert "Translate" in prompt

    def test_all_roles_defined(self):
        for role in ("general", "product", "dev", "ops"):
            assert role in ROLE_PROMPTS


class TestTranslationService:
    @pytest.mark.asyncio
    async def test_translate(self, monkeypatch):
        mock_client = AsyncMock()
        mock_client.complete = AsyncMock(return_value=LLMResult(content="Hola", tokens_used=5))
        monkeypatch.setattr("app.llm.service.LLMClient", lambda: mock_client)

        service = TranslationService()
        result = await service.translate("Hello", "en", "es")
        assert result.text == "Hola"
        assert result.tokens_used == 5

    @pytest.mark.asyncio
    async def test_translate_stream(self, monkeypatch):
        async def fake_stream(_):
            yield "Hol"
            yield "a"

        mock_client = AsyncMock()
        mock_client.stream = fake_stream
        monkeypatch.setattr("app.llm.service.LLMClient", lambda: mock_client)

        chunks = []
        service = TranslationService()
        async for chunk in service.translate_stream("Hello", "en", "es"):
            chunks.append(chunk)
        assert "".join(chunks) == "Hola"
