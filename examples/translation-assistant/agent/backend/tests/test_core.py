from app.core.logger import get_logger, JsonFormatter
from app.core.exceptions import AppException, ValidationError, NotFoundError, TranslationError, LLMError
from app.core.context import get_request_id, set_request_id


class TestLogger:
    def test_get_logger_returns_logger(self):
        logger = get_logger("test-logger")
        assert logger is not None
        assert logger.name == "test-logger"

    def test_get_logger_reuses_handlers(self):
        logger1 = get_logger("test-logger")
        logger2 = get_logger("test-logger")
        assert logger1 is logger2

    def test_json_formatter_format(self):
        import logging
        formatter = JsonFormatter()
        record = logging.LogRecord(
            name="test", level=logging.INFO, pathname="", lineno=0,
            msg="test message", args=(), exc_info=None,
        )
        output = formatter.format(record)
        import json
        data = json.loads(output)
        assert data["level"] == "INFO"
        assert data["message"] == "test message"


class TestExceptions:
    def test_app_exception(self):
        ex = AppException("test", code="TEST", status_code=400)
        assert ex.message == "test"
        assert ex.code == "TEST"
        assert ex.status_code == 400

    def test_validation_error(self):
        ex = ValidationError("invalid input")
        assert ex.status_code == 400
        assert ex.code == "VALIDATION_ERROR"

    def test_not_found_error(self):
        ex = NotFoundError("not found")
        assert ex.status_code == 404

    def test_translation_error(self):
        ex = TranslationError("fail")
        assert ex.status_code == 500

    def test_llm_error(self):
        ex = LLMError("llm fail")
        assert ex.status_code == 502


class TestContext:
    def test_get_request_id(self):
        rid = get_request_id()
        assert isinstance(rid, str)
        assert len(rid) > 0

    def test_set_request_id(self):
        set_request_id("test-rid-123")
        assert get_request_id() == "test-rid-123"
