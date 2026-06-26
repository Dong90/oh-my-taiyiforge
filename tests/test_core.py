"""Tests for core exceptions and logging."""
import logging

from app.core.exceptions import AppError, RateLimitError, TranslationError, ValidationError


class TestExceptions:
    def test_app_error_defaults(self):
        err = AppError("test")
        assert err.message == "test"
        assert err.code == "INTERNAL_ERROR"
        assert err.status_code == 500

    def test_translation_error(self):
        err = TranslationError("LLM failed")
        assert err.code == "TRANSLATION_ERROR"
        assert err.status_code == 502

    def test_validation_error(self):
        err = ValidationError("bad input")
        assert err.code == "VALIDATION_ERROR"
        assert err.status_code == 400

    def test_rate_limit_error(self):
        err = RateLimitError("too fast")
        assert err.code == "RATE_LIMIT"
        assert err.status_code == 429

    def test_custom_error(self):
        err = AppError("custom", code="CUSTOM", status_code=418)
        assert err.code == "CUSTOM"
        assert err.status_code == 418

    def test_exception_is_raiseable(self):
        import pytest
        with pytest.raises(AppError):
            raise AppError("raised")


class TestLogging:
    def test_get_logger(self):
        from app.core.logging import get_logger
        logger = get_logger("test")
        assert isinstance(logger, logging.Logger)
        assert logger.name == "test"

    def test_setup_logging(self):
        from app.core.logging import setup_logging
        setup_logging()
        root = logging.getLogger()
        assert root.level == logging.INFO
