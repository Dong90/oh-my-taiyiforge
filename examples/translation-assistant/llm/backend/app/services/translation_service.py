"""TranslationService - coordinates strategy + LLM for translation."""

from __future__ import annotations

import time
from typing import AsyncIterator

from ..strategies import STRATEGY_MAP
from ..models.request import TranslationRequest
from ..models.response import TranslationResponse
from ..core.logger import get_logger
from ..core.exceptions import ValidationException
from .llm_service import LLMService, get_llm_service
from .metrics_service import MetricsService, get_metrics_service

logger = get_logger(__name__)


class TranslationService:
    """Core translation service - selects strategy, calls LLM, records metrics."""

    def __init__(
        self,
        llm: LLMService | None = None,
        metrics: MetricsService | None = None,
    ):
        self._llm = llm or get_llm_service()
        self._metrics = metrics or get_metrics_service()

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        direction = request.direction
        if direction not in STRATEGY_MAP:
            raise ValidationException(
                f"Unknown direction: {direction}. "
                f"Supported: {', '.join(STRATEGY_MAP.keys())}"
            )

        strategy = STRATEGY_MAP[direction]
        system_prompt = strategy.get_system_prompt()
        user_prompt = strategy.format_prompt(request.text)

        logger.info(
            f"Translating direction={direction} "
            f"text_len={len(request.text)}"
        )

        start = time.time()
        result = await self._llm.generate(system_prompt, user_prompt)
        duration_ms = (time.time() - start) * 1000

        self._metrics.record(direction, duration_ms)

        return TranslationResponse(
            text=result,
            direction=direction,
            duration_ms=round(duration_ms, 1),
        )

    async def translate_stream(
        self, request: TranslationRequest
    ) -> AsyncIterator[str]:
        direction = request.direction
        if direction not in STRATEGY_MAP:
            raise ValidationException(
                f"Unknown direction: {direction}. "
                f"Supported: {', '.join(STRATEGY_MAP.keys())}"
            )

        strategy = STRATEGY_MAP[direction]
        system_prompt = strategy.get_system_prompt()
        user_prompt = strategy.format_prompt(request.text)

        logger.info(
            f"Streaming direction={direction} text_len={len(request.text)}"
        )

        start = time.time()
        async for chunk in self._llm.generate_stream(system_prompt, user_prompt):
            yield chunk

        duration_ms = (time.time() - start) * 1000
        self._metrics.record(direction, duration_ms)


_service_instance: TranslationService | None = None


def get_translation_service() -> TranslationService:
    global _service_instance
    if _service_instance is None:
        _service_instance = TranslationService()
    return _service_instance
