"""Wraps the LLM adapter with retries and formatting convenience."""
from __future__ import annotations

import logging
from collections.abc import AsyncGenerator

from ..adapters.base import LLMAdapter

LOGGER = logging.getLogger(__name__)


class LLMService:
    """High-level facade over an ``LLMAdapter``.

    Adds retry-on-failure logic and structured logging so callers
    (primarily ``TranslationService``) don't need to deal with the
    raw adapter.
    """

    def __init__(self, adapter: LLMAdapter, max_retries: int = 2) -> None:
        self._adapter = adapter
        self._max_retries = max_retries

    async def translate(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> str:
        last_exc: Exception | None = None
        for attempt in range(1, self._max_retries + 2):  # 1 initial + N retries
            try:
                result = await self._adapter.chat_completion(
                    messages, temperature=temperature, max_tokens=max_tokens
                )
                LOGGER.debug("LLM translate OK (attempt %d/%d)", attempt, self._max_retries + 1)
                return result
            except Exception as exc:
                last_exc = exc
                LOGGER.warning("LLM call failed (attempt %d/%d): %s", attempt, self._max_retries + 1, exc)
                if attempt <= self._max_retries:
                    continue
                raise

        # Should never reach here, but keep the type-checker happy.
        assert last_exc is not None
        raise last_exc

    async def translate_stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> AsyncGenerator[str, None]:
        try:
            async for token in self._adapter.chat_completion_stream(
                messages, temperature=temperature, max_tokens=max_tokens
            ):
                yield token
        except Exception as exc:
            LOGGER.error("LLM stream failed: %s", exc)
            raise
