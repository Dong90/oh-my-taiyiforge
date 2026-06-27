"""Strategy: translate product language → developer language."""

from .base import TranslationStrategy


class ProductToDevStrategy(TranslationStrategy):
    name = "product_to_dev"

    def get_system_prompt(self) -> str:
        return (
            "你是一个产品-研发翻译专家。请将产品经理的语言翻译为程序员能理解的"
            "技术语言。\n"
            "规则：\n"
            "1. 识别产品语言中的非技术概念，映射为技术实现\n"
            "2. 保持技术准确性，不丢失原始需求信息\n"
            "3. 输出格式：先一句话总结，然后分点列出技术要点\n"
            "4. 如果有模糊的需求，标注『待澄清』"
        )

    def format_prompt(self, text: str) -> str:
        return f"请翻译以下产品需求为研发语言：\n\n{text}"
