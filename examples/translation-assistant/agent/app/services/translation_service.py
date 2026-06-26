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
from ..core.exceptions import TranslationException, ValidationException, LLMServiceException

logger = get_logger(__name__)

DIRECTION_LABELS = {
    "product_to_dev": "产品→开发",
    "dev_to_product": "开发→产品",
    "dev_to_ops": "开发→运营",
    "ops_to_dev": "运营→开发",
    "product_to_ops": "产品→运营",
    "ops_to_product": "运营→产品",
}


class TranslationService:
    """翻译服务类
    
    负责协调策略和LLM服务，完成翻译业务逻辑
    使用策略模式，根据方向选择不同的翻译策略
    """
    
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self._strategies = {
            "product_to_dev": ProductToDevStrategy(),
            "dev_to_product": DevToProductStrategy(),
            "dev_to_ops": DevToOpsStrategy(),
            "ops_to_dev": OpsToDevStrategy(),
            "product_to_ops": ProductToOpsStrategy(),
            "ops_to_product": OpsToProductStrategy(),
        }
    
    def get_direction_label(self, direction: str) -> str:
        return DIRECTION_LABELS.get(direction, direction)
    
    def list_directions(self) -> list[tuple[str, str]]:
        return [(k, DIRECTION_LABELS[k]) for k in self._strategies]
    
    def _get_strategy(self, direction: str) -> TranslationStrategy:
        strategy = self._strategies.get(direction)
        if not strategy:
            raise TranslationException(
                f"Unknown translation direction: {direction}",
                error_code="INVALID_DIRECTION"
            )
        return strategy
    
    async def translate_stream(
        self, 
        text: str, 
        direction: str
    ) -> AsyncIterator[str]:
        """流式翻译"""
        if not text or not text.strip():
            raise ValidationException("Text cannot be empty", error_code="EMPTY_TEXT")
        
        strategy = self._get_strategy(direction)
        system_prompt = strategy.get_system_prompt()
        user_prompt = strategy.format_prompt(text)
        
        async for chunk in self.llm_service.translate_stream(user_prompt, system_prompt):
            if chunk:
                yield chunk
    
    async def translate(
        self, 
        text: str, 
        direction: str
    ) -> str:
        """一次性翻译"""
        if not text or not text.strip():
            raise ValidationException("Text cannot be empty", error_code="EMPTY_TEXT")
        
        strategy = self._get_strategy(direction)
        system_prompt = strategy.get_system_prompt()
        user_prompt = strategy.format_prompt(text)
        
        result = await self.llm_service.translate(user_prompt, system_prompt)
        
        if not result or not result.strip():
            raise TranslationException(
                "Translation returned empty result",
                error_code="EMPTY_RESULT"
            )
        
        return result
