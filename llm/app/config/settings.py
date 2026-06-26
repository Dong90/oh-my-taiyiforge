"""配置管理 - pydantic-settings"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    # OpenAI
    openai_api_key: str = "sk-GiYOUyrjQR4Fe7Knord0Wt4MWgZ8e7Q9jp9EaVGtQnAey40X"
    openai_api_base_url: str = "https://s.lconai.com/v1"
    openai_model: str = "gpt-4"
    openai_timeout: int = 60
    openai_max_retries: int = 3

    # App
    app_name: str = "translation-assistant"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1

    # CORS
    cors_origins: list[str] = ["*"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    def get_cors_origins(self) -> list[str]:
        if "*" in self.cors_origins:
            return ["*"]
        return self.cors_origins


settings = Settings()
