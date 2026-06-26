"""翻译服务 - 核心业务逻辑"""
from typing import AsyncIterator
from ..strategies.base import TranslationStrategy
from ..strategies.product_to_dev import ProductToDevStrategy
from ..strategies.dev_to_product import DevToProductStrategy
from ..strategies.dev_to_ops import DevToOpsStrategy
from ..strategies.ops_to_dev import OpsToDevStrategy
from ..strategies.product_to_ops import ProductToOpsStrategy
from ..strategies.ops_to_product import OpsToProductStrategy
from ..services.llm_service import LLMService
from ..core.logger import get_logger
from ..core.exceptions import TranslationException, ValidationException

logger = get_logger(__name__)


class TranslationService:
    """翻译服务 - 协调策略和 LLM 服务"""

    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self._strategies: dict[str, TranslationStrategy] = {
            "product_to_dev": ProductToDevStrategy(),
            "dev_to_product": DevToProductStrategy(),
            "dev_to_ops": DevToOpsStrategy(),
            "ops_to_dev": OpsToDevStrategy(),
            "product_to_ops": ProductToOpsStrategy(),
            "ops_to_product": OpsToProductStrategy(),
        }

    def _get_strategy(self, direction: str) -> TranslationStrategy:
        strategy = self._strategies.get(direction)
        if not strategy:
            raise TranslationException(
                f"Unknown direction: {direction}",
                error_code="INVALID_DIRECTION",
            )
        return strategy

    async def translate(self, text: str, direction: str) -> str:
        if not text or not text.strip():
            raise ValidationException("Text cannot be empty", error_code="EMPTY_TEXT")

        strategy = self._get_strategy(direction)
        system_prompt = strategy.get_system_prompt()
        user_prompt = strategy.format_prompt(text)

        result = await self.llm_service.translate(user_prompt, system_prompt)

        if not result or not result.strip():
            raise TranslationException(
                "Translation returned empty result",
                error_code="EMPTY_RESULT",
            )
        return result

    async def translate_stream(self, text: str, direction: str) -> AsyncIterator[str]:
        if not text or not text.strip():
            raise ValidationException("Text cannot be empty", error_code="EMPTY_TEXT")

        strategy = self._get_strategy(direction)
        system_prompt = strategy.get_system_prompt()
        user_prompt = strategy.format_prompt(text)

        async for chunk in self.llm_service.translate_stream(user_prompt, system_prompt):
            if chunk:
                yield chunk
