"""Pytest fixtures for the translation API test suite."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI

# Ensure the project root is on sys.path so that
# "services.translation_api.*" absolute imports work.
_project_root = Path(__file__).resolve().parent.parent.parent.parent  # up to project root
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from services.translation_api.adapters.base import LLMAdapter
from services.translation_api.services import LLMService, TranslationService


@pytest.fixture
def mock_adapter() -> AsyncMock:
    """Return a fully mocked LLM adapter."""
    adapter = AsyncMock(spec=LLMAdapter)
    adapter.chat_completion = AsyncMock(return_value="translated text")
    async def _stream(*args, **kwargs):
        yield "translated"
        yield " text"
    adapter.chat_completion_stream = _stream
    return adapter


@pytest.fixture
def llm_service(mock_adapter: AsyncMock) -> LLMService:
    """Return an LLMService backed by the mock adapter."""
    return LLMService(adapter=mock_adapter)


@pytest.fixture
def translation_service(llm_service: LLMService) -> TranslationService:
    """Return a TranslationService backed by mocked LLM."""
    return TranslationService(llm_service=llm_service)


@pytest.fixture
def app(translation_service: TranslationService) -> FastAPI:
    """Return a configured FastAPI app with injected services."""
    from services.translation_api.app import create_app as _create_app

    os.environ.setdefault("OPENAI_API_KEY", "sk-test-fake-key")
    app = _create_app()
    app.state.translation_service = translation_service
    return app
