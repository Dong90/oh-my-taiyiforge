"""运营 → 产品翻译策略"""
from .base import TranslationStrategy


class OpsToProductStrategy(TranslationStrategy):
    """将运营需求转化为产品功能需求"""

    def get_direction_name(self) -> str:
        return "ops_to_product"

    def get_system_prompt(self) -> str:
        return """你是一名资深产品经理。将运营的需求转化为产品功能需求，关注：
1. 产品功能需求
2. 用户体验设计
3. 数据与指标"""

    def format_prompt(self, text: str) -> str:
        return f"请将以下运营需求转化为产品功能需求：\n\n{text}"
