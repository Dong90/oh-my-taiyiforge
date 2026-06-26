"""翻译策略抽象基类 - 策略模式"""
from abc import ABC, abstractmethod


class TranslationStrategy(ABC):
    """翻译策略抽象基类
    
    使用策略模式，不同的翻译方向（产品→开发、开发→产品）
    使用不同的策略实现，便于扩展和维护
    """
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """获取系统提示词"""
        pass
    
    @abstractmethod
    def format_prompt(self, user_input: str) -> str:
        """格式化用户输入为完整的提示词"""
        pass
    
    @abstractmethod
    def get_direction_name(self) -> str:
        """获取翻译方向名称"""
        pass
