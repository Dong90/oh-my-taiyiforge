"""产品 → 开发翻译策略"""
from .base import TranslationStrategy


class ProductToDevStrategy(TranslationStrategy):
    """将产品需求转化为技术实现方案"""

    def get_direction_name(self) -> str:
        return "product_to_dev"

    def get_system_prompt(self) -> str:
        return """你是一名资深开发工程师。将产品经理的需求转化为技术实现方案，关注：
1. 技术栈建议和架构选择
2. 数据来源和处理方式
3. 性能和实时性要求
4. 预估开发工作量"""

    def format_prompt(self, text: str) -> str:
        return f"请将以下产品需求转化为技术实现方案：\n\n{text}"
