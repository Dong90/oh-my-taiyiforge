from collections.abc import AsyncGenerator
from dataclasses import dataclass

from app.llm.client import LLMClient, LLMResult
from app.llm.prompts import build_translate_prompt


@dataclass
class TranslateResult:
    text: str
    source_lang: str
    target_lang: str
    tokens_used: int = 0


class TranslationService:
    def __init__(self):
        self.client = LLMClient()

    async def translate(
        self,
        text: str,
        source_lang: str = "auto",
        target_lang: str = "en",
        role: str = "general",
    ) -> TranslateResult:
        prompt = build_translate_prompt(text, source_lang, target_lang, role)
        result: LLMResult = await self.client.complete(prompt)
        return TranslateResult(
            text=result.content,
            source_lang=source_lang,
            target_lang=target_lang,
            tokens_used=result.tokens_used,
        )

    async def translate_stream(
        self,
        text: str,
        source_lang: str = "auto",
        target_lang: str = "en",
        role: str = "general",
    ) -> AsyncGenerator[str, None]:
        prompt = build_translate_prompt(text, source_lang, target_lang, role)
        async for chunk in self.client.stream(prompt):
            yield chunk
