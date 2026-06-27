"""响应模型"""

from pydantic import BaseModel, Field


class TranslationResponse(BaseModel):
    """翻译响应模型"""
    translated_text: str = Field(
        ...,
        description="翻译后的文本",
    )
    direction: str = Field(
        ...,
        description="翻译方向",
    )
    original_text: str = Field(
        ...,
        description="原始输入文本",
    )


class ErrorResponse(BaseModel):
    """错误响应模型"""
    error_code: str = Field(..., description="错误码")
    message: str = Field(..., description="错误消息")
    details: dict | None = Field(default=None, description="错误详情")
