import pytest
from app.models.translation import TranslationRequest, TranslationResponse, TranslationDirection
from app.models.metrics import MetricsResponse


class TestTranslationModels:
    def test_translation_request_valid(self):
        req = TranslationRequest(direction="product_to_dev", text="测试")
        assert req.direction == TranslationDirection.PRODUCT_TO_DEV
        assert req.text == "测试"

    def test_translation_request_empty_text(self):
        with pytest.raises(Exception):
            TranslationRequest(direction="product_to_dev", text="")

    def test_translation_request_invalid_direction(self):
        with pytest.raises(Exception):
            TranslationRequest(direction="invalid", text="测试")

    def test_translation_response(self):
        resp = TranslationResponse(
            result="result text",
            direction=TranslationDirection.PRODUCT_TO_DEV,
            original="original text",
        )
        assert resp.result == "result text"

    def test_metrics_response_defaults(self):
        m = MetricsResponse()
        assert m.total_translations == 0
        assert m.avg_response_time_ms == 0.0


class TestTranslationDirection:
    def test_six_directions_defined(self):
        values = [e.value for e in TranslationDirection]
        assert len(values) == 6
        assert "product_to_dev" in values
        assert "dev_to_product" in values
