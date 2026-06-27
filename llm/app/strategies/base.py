"""翻译策略抽象基类"""
from abc import ABC, abstractmethod


class TranslationStrategy(ABC):
    """翻译策略基类"""

    @abstractmethod
    def get_direction_name(self) -> str:
        ...

    @abstractmethod
    def get_system_prompt(self) -> str:
        """系统提示词：定义 AI 角色和翻译规则"""
        ...

    @abstractmethod
    def format_prompt(self, text: str) -> str:
        """格式化的用户提示词"""
        ...
