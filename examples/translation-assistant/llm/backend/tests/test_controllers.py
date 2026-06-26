"""Integration tests for API endpoints."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_endpoint(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_ready_endpoint(client):
    resp = await client.get("/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ready"


@pytest.mark.asyncio
async def test_live_endpoint(client):
    resp = await client.get("/live")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "alive"


@pytest.mark.asyncio
async def test_metrics_endpoint(client):
    resp = await client.get("/api/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_translations" in data
    assert "directions" in data


@pytest.mark.asyncio
async def test_translate_invalid_direction(client):
    resp = await client.post(
        "/api/translation/translate",
        json={"text": "test", "direction": "invalid"},
    )
    assert resp.status_code == 400
    data = resp.json()
    assert "error" in data


@pytest.mark.asyncio
async def test_translate_empty_text(client):
    resp = await client.post(
        "/api/translation/translate",
        json={"text": "", "direction": "product_to_dev"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_metrics_empty_state(client):
    resp = await client.get("/api/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_translations"] == 0
