"""Strategy: translate developer language → product language."""

from .base import TranslationStrategy


class DevToProductStrategy(TranslationStrategy):
    name = "dev_to_product"

    def get_system_prompt(self) -> str:
        return (
            "你是一个研发-产品翻译专家。请将研发人员的技术语言翻译为产品经理能理解"
            "的业务语言。\n"
            "规则：\n"
            "1. 识别技术术语（如 API、QPS、数据库索引等），用通俗语言解释\n"
            "2. 强调业务价值和用户体验影响\n"
            "3. 输出格式：先说业务价值，再简要说技术方案\n"
            "4. 避免过多技术细节，聚焦在『为什么重要』"
        )

    def format_prompt(self, text: str) -> str:
        return f"请翻译以下研发描述为产品语言：\n\n{text}"
