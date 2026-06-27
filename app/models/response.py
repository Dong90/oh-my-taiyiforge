from pydantic import BaseModel, Field


class TranslationResponse(BaseModel):
    translated_text: str
    source_lang: str
    target_lang: str
    tokens_used: int = 0


class ErrorResponse(BaseModel):
    error: str
    code: str
    detail: str | None = None
