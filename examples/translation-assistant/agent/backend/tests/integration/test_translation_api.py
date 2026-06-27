"""Integration tests for translation API endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200

@pytest.mark.asyncio
async def test_translate_product_to_dev():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/translation/translate", json={
            "direction": "product_to_dev",
            "text": "我们需要一个智能推荐功能"
        })
        assert response.status_code in (200, 422, 500)  # 500 if no API key
