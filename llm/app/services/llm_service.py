"""LLM 服务"""
from typing import AsyncIterator
from ..adapters.base import LLMAdapter
from ..core.logger import get_logger

logger = get_logger(__name__)


class LLMService:
    """LLM 服务，封装适配器调用"""

    def __init__(self, adapter: LLMAdapter):
        self.adapter = adapter

    async def translate(self, user_prompt: str, system_prompt: str | None = None) -> str:
        return await self.adapter.complete(user_prompt, system_prompt)

    async def translate_stream(
        self, user_prompt: str, system_prompt: str | None = None
    ) -> AsyncIterator[str]:
        async for chunk in self.adapter.complete_stream(user_prompt, system_prompt):
            yield chunk
