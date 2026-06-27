"""LLM 适配器抽象基类"""
from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMAdapter(ABC):
    """LLM 适配器抽象基类"""

    @abstractmethod
    async def complete(self, prompt: str, system_prompt: str | None = None) -> str:
        """非流式完成"""
        ...

    @abstractmethod
    async def complete_stream(
        self, prompt: str, system_prompt: str | None = None
    ) -> AsyncIterator[str]:
        """流式完成"""
        ...
