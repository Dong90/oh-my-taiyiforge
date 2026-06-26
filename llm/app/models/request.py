"""请求模型"""

from pydantic import BaseModel, Field
from typing import Literal


class TranslationRequest(BaseModel):
    """翻译请求模型"""
    text: str = Field(
        ...,
        description="要翻译的文本内容",
        min_length=1,
        max_length=10000,
    )
    direction: Literal[
        "product_to_dev", "dev_to_product", "dev_to_ops",
        "ops_to_dev", "product_to_ops", "ops_to_product"
    ] = Field(
        ...,
        description="翻译方向",
    )
    stream: bool = Field(
        default=False,
        description="是否使用流式输出（SSE）",
    )
