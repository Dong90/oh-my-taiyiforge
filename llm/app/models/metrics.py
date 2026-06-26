"""指标数据模型"""

from pydantic import BaseModel
from typing import Any
from datetime import datetime


class TranslationMetrics(BaseModel):
    """翻译指标"""
    total_translations: int = 0
    total_characters: int = 0
    total_tokens: int = 0
    success_count: int = 0
    error_count: int = 0
    avg_response_time_ms: float = 0.0


class DirectionMetrics(BaseModel):
    """翻译方向指标"""
    product_to_dev: int = 0
    dev_to_product: int = 0
    dev_to_ops: int = 0
    ops_to_dev: int = 0
    product_to_ops: int = 0
    ops_to_product: int = 0


class MetricsResponse(BaseModel):
    """指标响应模型"""
    translation: TranslationMetrics
    direction: DirectionMetrics
    performance: dict[str, float] = {}
    errors: dict[str, int] = {}
    cost_estimate: dict[str, Any] = {}
    updated_at: datetime
