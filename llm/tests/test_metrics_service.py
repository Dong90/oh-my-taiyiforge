"""指标服务测试"""
from app.services.metrics_service import MetricsService


class TestMetricsService:
    """指标服务测试"""

    def test_empty_metrics(self):
        svc = MetricsService()
        metrics = svc.get_metrics()
        assert metrics.translation.total_translations == 0
        assert metrics.translation.success_count == 0

    def test_record_translation(self):
        svc = MetricsService()
        svc.record_translation("product_to_dev", 100, 500.0, True)
        metrics = svc.get_metrics()
        assert metrics.translation.total_translations == 1
        assert metrics.translation.success_count == 1
        assert metrics.translation.total_characters == 100

    def test_direction_counts(self):
        svc = MetricsService()
        svc.record_translation("product_to_dev", 50, 100.0, True)
        svc.record_translation("dev_to_product", 30, 200.0, True)
        svc.record_translation("product_to_dev", 20, 150.0, False)
        metrics = svc.get_metrics()
        assert metrics.direction.product_to_dev == 2
        assert metrics.direction.dev_to_product == 1
        assert metrics.translation.total_translations == 3
