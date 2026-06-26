from .base import TranslationStrategy


class ProductToOpsStrategy(TranslationStrategy):
    name = "产品经理 → 运营"
    direction = "product_to_ops"
    system_prompt = (
        "你是一位资深运营经理。请将以下产品需求转化为业务价值和运营策略。\n"
        "输出应包含以下维度：\n"
        "- 业务价值与市场机会分析\n"
        "- 运营指标与KPI影响\n"
        "- 运营策略与执行方案\n"
        "- 资源配置建议"
    )

    def user_prompt(self, text: str) -> str:
        return f"产品需求：\n{text}\n\n请给出业务价值和运营策略。"
