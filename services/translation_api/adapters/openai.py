"""OpenAI-backed LLM adapter."""
from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from typing import Any

from openai import AsyncOpenAI

from .base import LLMAdapter
from services.translation_api.config import get_settings

LOGGER = logging.getLogger(__name__)


class OpenAIAdapter(LLMAdapter):
    """Concrete adapter that calls the OpenAI Chat Completion API.

    Reads credentials and model name from ``Settings`` (pydantic-settings).
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            timeout=settings.OPENAI_TIMEOUT_SECONDS,
        )
        self._model = settings.OPENAI_MODEL
        LOGGER.info("OpenAIAdapter initialised; model=%s", self._model)

    # ── public API ──────────────────────────────────────────────────────

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> str:
        kwargs: dict[str, Any] = dict(
            model=self._model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        response = await self._client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content or ""
        LOGGER.debug("chat_completion: %d tokens in → %d chars out",
                      self._count_tokens(messages), len(content))
        return content

    async def chat_completion_stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> AsyncGenerator[str, None]:
        kwargs: dict[str, Any] = dict(
            model=self._model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        stream = await self._client.chat.completions.create(**kwargs)
        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            token = (delta.content or "") if delta else ""
            if token:
                yield token

    # ── internal helpers ────────────────────────────────────────────────

    @staticmethod
    def _count_tokens(messages: list[dict[str, str]]) -> int:
        """Very rough token estimate (4 chars ≈ 1 token)."""
        total = sum(len(m["content"]) for m in messages if "content" in m)
        return total // 4
