"""OpenAI-compatible LLM adapter (works with any OpenAI-like API)."""

from typing import AsyncIterator

from openai import AsyncOpenAI

from app.config.settings import get_settings
from .base import LLMAdapter


class OpenAIAdapter(LLMAdapter):
    """Adapter for OpenAI and OpenAI-compatible APIs."""

    def __init__(self):
        settings = get_settings()
        client_kwargs = {"api_key": settings.openai_api_key}
        if settings.openai_api_base_url:
            client_kwargs["base_url"] = settings.openai_api_base_url
        self._client = AsyncOpenAI(**client_kwargs)
        self._model = settings.openai_model

    async def chat_completion(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        max_tokens: int = 2048,
        **kwargs,
    ) -> str:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs,
        )
        return response.choices[0].message.content or ""

    async def chat_completion_stream(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        max_tokens: int = 2048,
        **kwargs,
    ) -> AsyncIterator[str]:
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
            **kwargs,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content
