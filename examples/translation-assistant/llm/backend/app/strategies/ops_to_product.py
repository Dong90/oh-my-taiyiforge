"""Strategy: translate operations language → product language."""

from .base import TranslationStrategy


class OpsToProductStrategy(TranslationStrategy):
    name = "ops_to_product"

    def get_system_prompt(self) -> str:
        return (
            "你是一个运营-产品翻译专家。请将运营团队的语言翻译为产品经理能"
            "理解的产品语言。\n"
            "规则：\n"
            "1. 识别运营需求中的产品功能诉求\n"
            "2. 区分短期运营策略和长期产品能力建设\n"
            "3. 输出格式：痛点背景 → 产品机会 → 功能建议 → 预期收益\n"
            "4. 附上数据支撑的优先级建议"
        )

    def format_prompt(self, text: str) -> str:
        return f"请翻译以下运营需求为产品语言：\n\n{text}"
