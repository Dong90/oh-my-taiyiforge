"""Orchestrates strategy selection and LLM invocation for translation."""
from __future__ import annotations

import logging
from collections.abc import AsyncGenerator

from ..models.schemas import TranslateRequest, TranslateResponse
from ..strategies import (
    DevToOpsStrategy,
    DevToProductStrategy,
    OpsToDevStrategy,
    OpsToProductStrategy,
    ProductToDevStrategy,
    ProductToOpsStrategy,
    TranslationStrategy,
)
from .llm_service import LLMService

LOGGER = logging.getLogger(__name__)

_DIRECTION_REGISTRY: dict[str, type[TranslationStrategy]] = {
    "dev_to_product": DevToProductStrategy,
    "product_to_dev": ProductToDevStrategy,
    "dev_to_ops": DevToOpsStrategy,
    "ops_to_dev": OpsToDevStrategy,
    "product_to_ops": ProductToOpsStrategy,
    "ops_to_product": OpsToProductStrategy,
}


class TranslationService:
    """Entry point for translating text between roles.

    Uses a strategy registry to select the appropriate direction, then
    delegates the actual LLM call to ``LLMService``.
    """

    def __init__(self, llm_service: LLMService) -> None:
        self._llm = llm_service

    async def translate(self, request: TranslateRequest) -> TranslateResponse:
        direction = request.to_direction()
        strategy = self._get_strategy(direction.value)

        messages = strategy.build_messages(request.text)
        translated = await self._llm.translate(messages)

        return TranslateResponse(
            translated_text=translated,
            source_role=request.from_role,
            target_role=request.to_role,
        )

    async def translate_stream(
        self, request: TranslateRequest
    ) -> AsyncGenerator[str, None]:
        direction = request.to_direction()
        strategy = self._get_strategy(direction.value)

        messages = strategy.build_messages(request.text)
        async for token in self._llm.translate_stream(messages):
            yield token

    # ── internal ────────────────────────────────────────────────────────

    @staticmethod
    def _get_strategy(direction: str) -> TranslationStrategy:
        cls = _DIRECTION_REGISTRY.get(direction)
        if cls is None:
            msg = f"Unknown translation direction: {direction}"
            raise ValueError(msg)
        return cls()
