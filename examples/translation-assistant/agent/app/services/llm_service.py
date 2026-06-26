"""LLM服务 - 封装大模型调用逻辑"""
from typing import AsyncIterator
from ..adapters.base import LLMAdapter


class LLMService:
    """LLM服务类
    
    封装大模型调用，提供统一的接口
    使用依赖注入，可以切换不同的适配器
    """
    
    def __init__(self, adapter: LLMAdapter):
        self.adapter = adapter
    
    async def translate_stream(
        self, 
        prompt: str, 
        system_prompt: str
    ) -> AsyncIterator[str]:
        """流式翻译"""
        async for chunk in self.adapter.stream_complete(prompt, system_prompt):
            yield chunk
    
    async def translate(
        self, 
        prompt: str, 
        system_prompt: str
    ) -> str:
        """一次性翻译"""
        return await self.adapter.complete(prompt, system_prompt)
