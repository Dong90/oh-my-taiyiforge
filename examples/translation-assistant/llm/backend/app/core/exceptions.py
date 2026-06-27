"""Custom exception hierarchy for the translation assistant."""

from __future__ import annotations


class TranslationException(Exception):
    """Base exception for translation-related errors."""

    def __init__(self, message: str, code: str = "TRANSLATION_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)


class ValidationException(TranslationException):
    """Input validation error."""

    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message, code="VALIDATION_ERROR", status_code=400)
        self.details = details or {}


class ServiceException(TranslationException):
    """Service-level error (LLM unavailable, config missing, etc.)."""

    def __init__(self, message: str, code: str = "SERVICE_ERROR", status_code: int = 503):
        super().__init__(message, code=code, status_code=status_code)
