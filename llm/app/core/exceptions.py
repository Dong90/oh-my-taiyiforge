"""自定义异常类"""
from typing import Any


class AppException(Exception):
    """应用异常基类"""
    def __init__(self, message: str, error_code: str = "UNKNOWN", status_code: int = 400, details: Any = None):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class TranslationException(AppException):
    """翻译业务异常"""
    def __init__(self, message: str, error_code: str = "TRANSLATION_ERROR", status_code: int = 500):
        super().__init__(message, error_code=error_code, status_code=status_code)


class ValidationException(AppException):
    """参数校验异常"""
    def __init__(self, message: str, error_code: str = "VALIDATION_ERROR", status_code: int = 400):
        super().__init__(message, error_code=error_code, status_code=status_code)


class ConfigurationException(AppException):
    """配置异常"""
    def __init__(self, message: str, error_code: str = "CONFIG_ERROR", status_code: int = 500):
        super().__init__(message, error_code=error_code, status_code=status_code)
