"""OpenAI API适配器实现"""
from typing import AsyncIterator
from openai import AsyncOpenAI
import httpx
from .base import LLMAdapter
from ..core.logger import get_logger
from ..core.exceptions import AdapterException, ConfigurationException
from ..config import settings

logger = get_logger(__name__)


class OpenAIAdapter(LLMAdapter):
    """OpenAI API适配器"""
    
    def __init__(self, api_key: str = None, base_url: str = None, model: str = None):
        self.api_key = api_key if api_key else (settings.openai_api_key if settings.openai_api_key else None)
        
        if not self.api_key:
            raise ConfigurationException(
                "OpenAI API key is required. Please set OPENAI_API_KEY environment variable.",
                error_code="MISSING_API_KEY"
            )
        
        self.base_url = base_url if base_url else settings.openai_api_base_url
        self.model = model if model else settings.openai_model
        
        client_kwargs = {
            "api_key": self.api_key,
            "timeout": settings.openai_timeout,
            "max_retries": settings.openai_max_retries
        }
        if self.base_url:
            client_kwargs["base_url"] = self.base_url
        
        try:
            http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(settings.openai_timeout, connect=10.0),
                follow_redirects=True
            )
            client_kwargs["http_client"] = http_client
        except Exception:
            pass
        
        self.client = AsyncOpenAI(**client_kwargs)
    
    async def stream_complete(
        self, 
        prompt: str, 
        system_prompt: str = ""
    ) -> AsyncIterator[str]:
        """流式生成文本"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        yield delta.content
        except Exception as e:
            raise AdapterException(
                f"OpenAI API stream call failed: {str(e)}",
                error_code="STREAM_API_ERROR"
            ) from e
    
    async def complete(
        self, 
        prompt: str, 
        system_prompt: str = ""
    ) -> str:
        """一次性生成完整文本"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages
            )
        except Exception as e:
            raise AdapterException(
                f"OpenAI API call failed: {str(e)}",
                error_code="API_CALL_ERROR"
            ) from e
        
        if not response.choices or len(response.choices) == 0:
            raise AdapterException(
                "OpenAI API returned empty response",
                error_code="EMPTY_RESPONSE"
            )
        
        message = response.choices[0].message
        if not message or not message.content:
            raise AdapterException(
                "OpenAI API returned empty content",
                error_code="EMPTY_CONTENT"
            )
        
        return message.content
