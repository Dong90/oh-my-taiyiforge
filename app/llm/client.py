from collections.abc import AsyncGenerator
from dataclasses import dataclass

from openai import AsyncOpenAI

from app.config.settings import settings


@dataclass
class LLMResult:
    content: str
    tokens_used: int


class LLMClient:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )

    async def complete(self, prompt: str) -> LLMResult:
        resp = await self.client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
        )
        return LLMResult(
            content=resp.choices[0].message.content or "",
            tokens_used=resp.usage.total_tokens if resp.usage else 0,
        )

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        stream = await self.client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content
