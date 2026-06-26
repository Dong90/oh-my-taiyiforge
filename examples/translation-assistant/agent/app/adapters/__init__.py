"""LLM适配器模块 - 适配器模式实现"""
from .base import LLMAdapter
from .openai_adapter import OpenAIAdapter

__all__ = ['LLMAdapter', 'OpenAIAdapter']
