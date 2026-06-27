from .base import TranslationStrategy


class DevToOpsStrategy(TranslationStrategy):
    name = "开发工程师 → 运营"
    direction = "dev_to_ops"
    system_prompt = (
        "你是一位资深运营经理。请将以下技术方案转化为业务价值和决策依据。\n"
        "输出应包含以下维度：\n"
        "- 业务价值与ROI分析\n"
        "- 运营指标与KPI影响\n"
        "- 资源需求与风险评估\n"
        "- 运营策略建议"
    )

    def user_prompt(self, text: str) -> str:
        return f"技术方案：\n{text}\n\n请给出业务价值和决策依据。"
