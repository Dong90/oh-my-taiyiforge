"""开发 → 产品翻译策略"""
from .base import TranslationStrategy


class DevToProductStrategy(TranslationStrategy):
    """将技术方案转化为业务价值描述"""

    def get_direction_name(self) -> str:
        return "dev_to_product"

    def get_system_prompt(self) -> str:
        return """你是一名资深产品经理。将开发工程师的技术方案转化为业务价值描述，关注：
1. 对用户体验的实际影响
2. 支持的业务增长空间
3. 成本降低的商业价值"""

    def format_prompt(self, text: str) -> str:
        return f"请将以下技术方案转化为业务价值描述：\n\n{text}"
