from enum import Enum

from pydantic import BaseModel, Field


class TranslationDirection(str, Enum):
    PRODUCT_TO_DEV = "product_to_dev"
    DEV_TO_PRODUCT = "dev_to_product"
    DEV_TO_OPS = "dev_to_ops"
    OPS_TO_DEV = "ops_to_dev"
    PRODUCT_TO_OPS = "product_to_ops"
    OPS_TO_PRODUCT = "ops_to_product"


class TranslationRequest(BaseModel):
    direction: TranslationDirection
    text: str = Field(..., min_length=1, max_length=10000)


class TranslationResponse(BaseModel):
    result: str
    direction: TranslationDirection
    original: str
