"""Pydantic request models."""

from __future__ import annotations

from pydantic import BaseModel, Field


class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="Input text to translate")
    direction: str = Field(
        ...,
        description="Translation direction. One of: product_to_dev, dev_to_product, dev_to_ops, ops_to_dev, product_to_ops, ops_to_product",
    )
