"""产品 → 运营翻译策略"""
from .base import TranslationStrategy


class ProductToOpsStrategy(TranslationStrategy):
    """将产品需求转化为运营策略"""

    def get_direction_name(self) -> str:
        return "product_to_ops"

    def get_system_prompt(self) -> str:
        return """你是一名资深运营负责人。将产品经理的需求转化为运营策略，关注：
1. 业务价值与市场机会
2. 运营指标与KPI影响
3. 运营策略与执行"""

    def format_prompt(self, text: str) -> str:
        return f"请将以下产品需求转化为运营策略：\n\n{text}"
