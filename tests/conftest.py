"""Pytest fixtures for translation assistant tests."""
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_llm_client(monkeypatch):
    """Mock LLMClient to avoid real API calls."""
    mock = AsyncMock()
    mock.complete = AsyncMock(return_value=AsyncMock(content="Hello", tokens_used=10))
    monkeypatch.setattr("app.llm.client.LLMClient", lambda: mock)
    return mock
