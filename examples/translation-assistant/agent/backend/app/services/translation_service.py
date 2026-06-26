import time
from typing import AsyncIterator

from ..core import get_logger
from ..models import TranslationRequest, TranslationResponse
from ..strategies import STRATEGY_MAP
from .llm_service import LLMService, get_llm_service
from .metrics_service import MetricsService, get_metrics_service

logger = get_logger("translation-service")


class TranslationService:
    def __init__(self, llm: LLMService, metrics: MetricsService):
        self.llm = llm
        self.metrics = metrics

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        strategy_cls = STRATEGY_MAP.get(request.direction.value)
        if not strategy_cls:
            raise ValueError(f"Unknown direction: {request.direction}")

        strategy = strategy_cls()
        system_prompt = strategy.get_system_prompt()
        user_prompt = strategy.user_prompt(request.text)

        start = time.time()
        result = await self.llm.generate(system_prompt, user_prompt)
        duration_ms = (time.time() - start) * 1000

        self.metrics.record(request.direction.value, duration_ms)

        return TranslationResponse(
            result=result,
            direction=request.direction,
            original=request.text,
        )

    async def translate_stream(self, request: TranslationRequest) -> AsyncIterator[str]:
        strategy_cls = STRATEGY_MAP.get(request.direction.value)
        if not strategy_cls:
            raise ValueError(f"Unknown direction: {request.direction}")

        strategy = strategy_cls()

        start = time.time()
        async for chunk in self.llm.generate_stream(
            strategy.get_system_prompt(), strategy.user_prompt(request.text)
        ):
            yield chunk

        duration_ms = (time.time() - start) * 1000
        self.metrics.record(request.direction.value, duration_ms)


_translation_service: TranslationService | None = None


def get_translation_service() -> TranslationService:
    global _translation_service
    if _translation_service is None:
        _translation_service = TranslationService(
            llm=get_llm_service(),
            metrics=get_metrics_service(),
        )
    return _translation_service
