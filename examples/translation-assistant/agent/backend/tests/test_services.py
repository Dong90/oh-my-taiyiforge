import pytest
from app.services.metrics_service import MetricsService


class TestMetricsService:
    @pytest.fixture
    def service(self):
        return MetricsService()

    def test_initial_metrics(self, service):
        m = service.get_metrics()
        assert m.total_translations == 0
        assert m.avg_response_time_ms == 0.0

    def test_record_metrics(self, service):
        service.record("product_to_dev", 150.5)
        service.record("dev_to_product", 250.5)
        m = service.get_metrics()
        assert m.total_translations == 2
        assert m.avg_response_time_ms == 200.5
        assert "product_to_dev" in m.direction_counts
        assert m.direction_counts["product_to_dev"] == 1
        assert m.direction_counts["dev_to_product"] == 1
        assert m.last_translation_at != ""
