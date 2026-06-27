"""Enhanced input validation models."""
from pydantic import BaseModel, Field, validator

VALID_DIRECTIONS = [
    "product_to_dev", "dev_to_product", "dev_to_ops",
    "ops_to_dev", "product_to_ops", "ops_to_product"
]

class TranslationRequestV1(BaseModel):
    direction: str = Field(..., description="翻译方向")
    text: str = Field(..., min_length=1, max_length=10000, description="待翻译文本")

    @validator('direction')
    def validate_direction(cls, v):
        if v not in VALID_DIRECTIONS:
            raise ValueError(f"无效的翻译方向: {v}，有效值: {VALID_DIRECTIONS}")
        return v
