"""应用异常定义"""


class TranslationAssistantException(Exception):
    """应用基础异常"""
    def __init__(self, message: str, error_code: str = "UNKNOWN"):
        self.error_code = error_code
        super().__init__(message)


class ConfigurationException(TranslationAssistantException):
    """配置错误"""
    pass


class AdapterException(TranslationAssistantException):
    """适配器错误"""
    pass


class LLMServiceException(TranslationAssistantException):
    """LLM服务错误"""
    pass


class TranslationException(TranslationAssistantException):
    """翻译错误"""
    pass


class ValidationException(TranslationAssistantException):
    """验证错误"""
    pass
