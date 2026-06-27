"""Tests for API endpoints."""
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def mock_llm(monkeypatch):
    mock_client = AsyncMock()
    mock_client.complete = AsyncMock(return_value=AsyncMock(content="Hola", tokens_used=5))

    async def fake_stream(_):
        yield "Hol"
        yield "a"

    mock_client.stream = fake_stream
    monkeypatch.setattr("app.llm.service.LLMClient", lambda: mock_client)
    return mock_client


@pytest.mark.asyncio
async def test_health(mock_llm):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_translate_success(mock_llm):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/translate", json={
            "text": "Hello", "target_lang": "es", "source_lang": "en",
        })
    assert resp.status_code == 200
    data = resp.json()
    assert "translated_text" in data
    assert data["source_lang"] == "en"
    assert data["target_lang"] == "es"


@pytest.mark.asyncio
async def test_translate_empty_text_fails(mock_llm):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/translate", json={
            "text": "", "target_lang": "es",
        })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_translate_stream(mock_llm):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with ac.stream("GET", "/api/translate?text=Hello&target_lang=es&source_lang=en") as resp:
            assert resp.status_code == 200
            chunks = []
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    chunks.append(line)
            assert len(chunks) >= 2


@pytest.mark.asyncio
async def test_metrics(mock_llm):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_requests" in data
    assert "total_tokens" in data
