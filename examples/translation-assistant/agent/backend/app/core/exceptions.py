

class AppException(Exception):
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class ValidationError(AppException):
    def __init__(self, message: str):
        super().__init__(message, code="VALIDATION_ERROR", status_code=400)


class NotFoundError(AppException):
    def __init__(self, message: str):
        super().__init__(message, code="NOT_FOUND", status_code=404)


class TranslationError(AppException):
    def __init__(self, message: str):
        super().__init__(message, code="TRANSLATION_ERROR", status_code=500)


class LLMError(AppException):
    def __init__(self, message: str):
        super().__init__(message, code="LLM_ERROR", status_code=502)
