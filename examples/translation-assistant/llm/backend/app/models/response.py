"""Pydantic response models."""

from __future__ import annotations

from pydantic import BaseModel


class TranslationResponse(BaseModel):
    text: str
    direction: str
    duration_ms: float
