from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_prefix": "TAIYI_", "case_sensitive": False}

    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # LLM
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.3
    llm_max_tokens: int = 2048

    # Rate limit
    rate_limit_per_minute: int = 60

    # Logging
    log_level: str = "INFO"


settings = Settings()
