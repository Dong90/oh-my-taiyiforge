from pydantic import BaseModel, Field


class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Source text to translate")
    source_lang: str = Field(default="auto", max_length=10)
    target_lang: str = Field(..., max_length=10)
    role: str = Field(default="general", max_length=20)
