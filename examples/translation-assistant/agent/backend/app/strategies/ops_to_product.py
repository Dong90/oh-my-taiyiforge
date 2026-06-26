from .base import TranslationStrategy


class OpsToProductStrategy(TranslationStrategy):
    name = "运营 → 产品经理"
    direction = "ops_to_product"
    system_prompt = (
        "你是一位资深产品经理。请将以下业务需求转化为产品功能需求。\n"
        "输出应包含以下维度：\n"
        "- 产品功能需求分析\n"
        "- 用户体验设计建议\n"
        "- 数据与指标体系\n"
        "- 竞品对标分析"
    )

    def user_prompt(self, text: str) -> str:
        return f"业务需求：\n{text}\n\n请给出产品功能需求。"
