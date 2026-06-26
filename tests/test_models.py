"""Tests for Pydantic models."""
import pytest
from pydantic import ValidationError

from app.models.metrics import MetricsData
from app.models.request import TranslationRequest
from app.models.response import ErrorResponse, TranslationResponse


class TestTranslationRequest:
    def test_valid_request(self):
        req = TranslationRequest(text="Hello", target_lang="zh")
        assert req.text == "Hello"
        assert req.source_lang == "auto"
        assert req.role == "general"

    def test_empty_text_fails(self):
        with pytest.raises(ValidationError):
            TranslationRequest(text="", target_lang="zh")

    def test_text_too_long_fails(self):
        with pytest.raises(ValidationError):
            TranslationRequest(text="x" * 5001, target_lang="zh")


class TestTranslationResponse:
    def test_valid_response(self):
        resp = TranslationResponse(translated_text="你好", source_lang="en", target_lang="zh")
        assert resp.translated_text == "你好"
        assert resp.tokens_used == 0


class TestErrorResponse:
    def test_error_response(self):
        resp = ErrorResponse(error="TRANSLATION_ERROR", code="TRANSLATION_ERROR", detail="LLM failed")
        assert resp.error == "TRANSLATION_ERROR"


class TestMetricsData:
    def test_defaults(self):
        m = MetricsData()
        assert m.total_requests == 0
        assert m.total_tokens == 0
        assert m.avg_latency_ms == 0.0

    def test_custom_values(self):
        m = MetricsData(total_requests=10, total_tokens=100, avg_latency_ms=45.5)
        assert m.total_requests == 10
        assert m.avg_latency_ms == 45.5
