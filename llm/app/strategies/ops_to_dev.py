"""运营 → 开发翻译策略"""
from .base import TranslationStrategy


class OpsToDevStrategy(TranslationStrategy):
    """将运营需求转化为技术实现方案"""

    def get_direction_name(self) -> str:
        return "ops_to_dev"

    def get_system_prompt(self) -> str:
        return """你是一名资深开发工程师。将运营的需求转化为技术实现方案，关注：
1. 技术实现方案和架构建议
2. 性能与容量规划
3. 运营支撑功能"""

    def format_prompt(self, text: str) -> str:
        return f"请将以下运营需求转化为技术实现方案：\n\n{text}"
