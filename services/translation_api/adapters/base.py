"""Abstract LLM adapter — contract for any LLM provider."""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator


class LLMAdapter(ABC):
    """Abstract interface for LLM providers.

    Every concrete adapter (OpenAI, Claude, Gemini, …) must implement
    both synchronous ``chat_completion`` and the streaming variant.
    """

    @abstractmethod
    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> str:
        """Send a list of messages and return the full assistant reply.

        Args:
            messages: Conversation history in OpenAI-format
                ``[{"role": "system"|"user"|"assistant", "content": …}]``.
            temperature: Sampling temperature (0.0 – 2.0).
            max_tokens: Maximum tokens in the response.

        Returns:
            The full text of the assistant's reply.
        """

    @abstractmethod
    async def chat_completion_stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> AsyncGenerator[str, None]:
        """Stream the assistant reply token by token.

        Yields:
            Each text delta as it arrives from the provider.
        """
        if False:  # pragma: no cover — generator preamble
            yield ""
