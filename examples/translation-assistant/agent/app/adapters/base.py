"""LLM适配器抽象基类 - 适配器模式"""
from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMAdapter(ABC):
    """大语言模型适配器抽象基类
    
    使用适配器模式，允许切换不同的大模型提供商
    而不需要修改业务逻辑代码
    """
    
    @abstractmethod
    async def stream_complete(
        self, 
        prompt: str, 
        system_prompt: str = ""
    ) -> AsyncIterator[str]:
        """流式生成文本"""
        pass
    
    @abstractmethod
    async def complete(
        self, 
        prompt: str, 
        system_prompt: str = ""
    ) -> str:
        """一次性生成完整文本"""
        pass
