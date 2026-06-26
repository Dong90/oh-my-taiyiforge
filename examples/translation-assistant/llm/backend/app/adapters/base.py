"""LLM adapter abstract base class."""

from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMAdapter(ABC):
    """Abstract interface for LLM API providers."""

    @abstractmethod
    async def chat_completion(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        max_tokens: int = 2048,
        **kwargs,
    ) -> str:
        """Non-streaming completion — returns full response string."""
        ...

    @abstractmethod
    async def chat_completion_stream(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        max_tokens: int = 2048,
        **kwargs,
    ) -> AsyncIterator[str]:
        """Streaming completion — yields content delta chunks."""
        ...
