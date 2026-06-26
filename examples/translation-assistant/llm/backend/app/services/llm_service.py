"""LLM service - coordinates LLM adapter calls."""

from __future__ import annotations

from typing import AsyncIterator

from ..adapters import OpenAIAdapter
from ..config import settings
from ..core.logger import get_logger
from ..core.exceptions import ServiceException

logger = get_logger(__name__)


class LLMService:
    """Manages LLM interaction via the adapter layer."""

    def __init__(self, adapter: OpenAIAdapter | None = None):
        self._adapter = adapter or OpenAIAdapter()

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Generate a non-streaming response from the LLM."""
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            result = await self._adapter.chat_completion(messages)
            return result or ""
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise ServiceException(
                message=f"LLM generation failed: {e}",
                code="LLM_ERROR",
                status_code=502,
            )

    async def generate_stream(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncIterator[str]:
        """Generate a streaming response from the LLM (SSE)."""
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            async for chunk in self._adapter.chat_completion_stream(messages):
                if chunk:
                    yield chunk
        except Exception as e:
            logger.error(f"LLM streaming failed: {e}")
            raise ServiceException(
                message=f"LLM streaming failed: {e}",
                code="LLM_STREAM_ERROR",
                status_code=502,
            )


_service_instance: LLMService | None = None


def get_llm_service() -> LLMService:
    global _service_instance
    if _service_instance is None:
        _service_instance = LLMService()
    return _service_instance
