"""OpenAI 适配器"""
from typing import AsyncIterator
from openai import AsyncOpenAI
from .base import LLMAdapter
from ..core.logger import get_logger

logger = get_logger(__name__)


class OpenAIAdapter(LLMAdapter):
    """OpenAI API 适配器"""

    def __init__(self, api_key: str, base_url: str | None = None, model: str = "gpt-4"):
        self.model = model
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def complete(self, prompt: str, system_prompt: str | None = None) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=False,
        )
        return response.choices[0].message.content or ""

    async def complete_stream(
        self, prompt: str, system_prompt: str | None = None
    ) -> AsyncIterator[str]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
