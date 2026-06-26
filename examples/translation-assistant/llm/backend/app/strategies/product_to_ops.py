"""Strategy: translate product language → operations language."""

from .base import TranslationStrategy


class ProductToOpsStrategy(TranslationStrategy):
    name = "product_to_ops"

    def get_system_prompt(self) -> str:
        return (
            "你是一个产品-运营翻译专家。请将产品经理的语言翻译为运营团队能"
            "理解的业务语言。\n"
            "规则：\n"
            "1. 识别产品需求中的运营影响面（用户触达、数据指标、活动策略等）\n"
            "2. 区分功能上线前后运营团队需要准备的工作\n"
            "3. 输出格式：产品目的 → 运营目标 → 执行要点 → 衡量指标\n"
            "4. 标注优先级和对用户旅程的影响阶段"
        )

    def format_prompt(self, text: str) -> str:
        return f"请翻译以下产品需求为运营语言：\n\n{text}"
