from typing import AsyncIterator

from ..adapters import OpenAIAdapter
from ..config import get_settings
from ..core import get_logger

logger = get_logger("llm-service")


class LLMService:
    def __init__(self, adapter: OpenAIAdapter):
        self.adapter = adapter

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        logger.info("llm_generate", extra={"system_len": len(system_prompt), "user_len": len(user_prompt)})
        return await self.adapter.complete(system_prompt, user_prompt)

    async def generate_stream(self, system_prompt: str, user_prompt: str) -> AsyncIterator[str]:
        logger.info("llm_stream", extra={"system_len": len(system_prompt), "user_len": len(user_prompt)})
        async for chunk in self.adapter.stream_complete(system_prompt, user_prompt):
            yield chunk


_llm_service: LLMService | None = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        settings = get_settings()
        adapter = OpenAIAdapter(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_API_BASE_URL,
            model=settings.OPENAI_MODEL,
        )
        _llm_service = LLMService(adapter)
    return _llm_service
