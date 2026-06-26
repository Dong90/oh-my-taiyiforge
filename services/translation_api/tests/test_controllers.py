"""Tests for the FastAPI controller endpoints."""
from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI


@pytest.mark.asyncio
async def test_health_endpoint(app: FastAPI):
    """GET /health returns 200 with status ok."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_ready_endpoint(app: FastAPI):
    """GET /ready returns 200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/ready")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_live_endpoint(app: FastAPI):
    """GET /live returns 200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/live")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_translate_endpoint(app: FastAPI):
    """POST /api/translation/translate returns 200 with translated text."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/translation/translate",
            json={"text": "Technical review done", "from_role": "dev", "to_role": "product"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "translated_text" in data
    assert data["source_role"] == "dev"
    assert data["target_role"] == "product"


@pytest.mark.asyncio
async def test_translate_invalid_role_422(app: FastAPI):
    """POST with invalid role returns 422 (Pydantic validation)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/translation/translate",
            json={"text": "hello", "from_role": "bad", "to_role": "product"},
        )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_translate_stream_endpoint(app: FastAPI):
    """POST /api/translation/translate/stream returns SSE."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with client.stream(
            "POST",
            "/api/translation/translate/stream",
            json={"text": "hi", "from_role": "dev", "to_role": "product"},
        ) as resp:
            assert resp.status_code == 200
            assert resp.headers.get("content-type", "").startswith("text/event-stream")
