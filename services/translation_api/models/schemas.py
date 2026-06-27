"""Pydantic request/response schemas for the Translation API."""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class TranslationDirection(str, Enum):
    """Enumeration of the 6 supported translation directions."""

    PRODUCT_TO_DEV = "product_to_dev"
    DEV_TO_PRODUCT = "dev_to_product"
    DEV_TO_OPS = "dev_to_ops"
    OPS_TO_DEV = "ops_to_dev"
    PRODUCT_TO_OPS = "product_to_ops"
    OPS_TO_PRODUCT = "ops_to_product"


class TranslateRequest(BaseModel):
    """Inbound translation request body."""

    text: str = Field(..., min_length=1, max_length=10000, description="Source text to translate")
    from_role: str = Field(..., description="Source role (product, dev, ops)")
    to_role: str = Field(..., description="Target role (product, dev, ops)")

    @field_validator("from_role", "to_role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {"product", "dev", "ops"}
        if v.lower() not in allowed:
            msg = f"Invalid role '{v}'. Must be one of: {', '.join(sorted(allowed))}"
            raise ValueError(msg)
        return v.lower()

    def to_direction(self) -> TranslationDirection:
        """Derive the direction enum from from_role/to_role."""
        key = f"{self.from_role}_to_{self.to_role}"
        if key not in TranslationDirection._value2member_map_:
            msg = f"Unsupported translation direction: {key}"
            raise ValueError(msg)
        return TranslationDirection(key)


class TranslateResponse(BaseModel):
    """Outbound translation response body (non-streaming)."""

    translated_text: str
    source_role: str
    target_role: str
    model: str = ""
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StreamEvent(BaseModel):
    """A single SSE event payload for streaming translation."""

    event: Literal["chunk", "done", "error"]
    data: str
    index: int = 0


class ErrorResponse(BaseModel):
    """Standard error response body."""

    detail: str
    error_code: str = "UNKNOWN"


class HealthStatus(BaseModel):
    """Health-check response."""

    status: Literal["ok", "degraded", "down"] = "ok"
    version: str = "1.0.0"
