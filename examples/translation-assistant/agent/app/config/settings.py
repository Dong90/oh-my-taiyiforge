"""应用配置 - 基于环境变量"""
import os
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class Settings:
    """应用配置类
    
    从环境变量加载配置，支持默认值
    """
    
    # OpenAI 配置
    openai_api_key: Optional[str] = field(
        default_factory=lambda: os.getenv("OPENAI_API_KEY")
    )
    openai_api_base_url: str = field(
        default_factory=lambda: os.getenv("OPENAI_API_BASE_URL", "https://api.openai.com/v1")
    )
    openai_model: str = field(
        default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o")
    )
    openai_timeout: float = field(
        default_factory=lambda: float(os.getenv("OPENAI_TIMEOUT", "60"))
    )
    openai_max_retries: int = field(
        default_factory=lambda: int(os.getenv("OPENAI_MAX_RETRIES", "3"))
    )
    
    # 应用配置
    log_level: str = field(
        default_factory=lambda: os.getenv("LOG_LEVEL", "INFO")
    )
    
    def validate(self) -> None:
        """验证配置是否完整"""
        from ..core.exceptions import ConfigurationException
        if not self.openai_api_key:
            raise ConfigurationException(
                "OPENAI_API_KEY environment variable is required. "
                "Please set it in your environment or .env file.",
                error_code="MISSING_API_KEY"
            )


settings = Settings()
