from .base import TranslationStrategy


class ProductToDevStrategy(TranslationStrategy):
    name = "产品经理 → 开发工程师"
    direction = "product_to_dev"
    system_prompt = (
        "你是一位资深开发工程师。请将以下产品需求转化为技术实现方案。\n"
        "输出应包含以下维度：\n"
        "- 技术栈建议\n"
        "- 数据来源和处理方式\n"
        "- 性能和实时性要求\n"
        "- 预估开发工作量（人天）\n"
        "- 潜在技术风险和注意事项"
    )

    def user_prompt(self, text: str) -> str:
        return f"产品需求：\n{text}\n\n请给出技术实现方案。"
