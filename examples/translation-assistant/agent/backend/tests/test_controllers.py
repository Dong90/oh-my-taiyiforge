from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestHealthEndpoints:
    def test_health(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_ready(self):
        response = client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"

    def test_live(self):
        response = client.get("/live")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"


class TestMetricsEndpoint:
    def test_metrics_endpoint(self):
        response = client.get("/api/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "total_translations" in data
        assert "avg_response_time_ms" in data


class TestTranslationEndpoint:
    def test_translate_invalid_direction(self):
        response = client.post(
            "/api/translation/translate",
            json={"direction": "invalid", "text": "test"},
        )
        assert response.status_code == 422

    def test_translate_empty_text(self):
        response = client.post(
            "/api/translation/translate",
            json={"direction": "product_to_dev", "text": ""},
        )
        assert response.status_code == 422

    def test_translate_valid_request_no_api_key(self):
        response = client.post(
            "/api/translation/translate",
            json={"direction": "product_to_dev", "text": "我们需要智能推荐"},
        )
        assert response.status_code == 200 or response.status_code == 500
        data = response.json()
        assert "result" in data or "error" in data
