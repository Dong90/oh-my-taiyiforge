from .base import TranslationStrategy


class OpsToDevStrategy(TranslationStrategy):
    name = "运营 → 开发工程师"
    direction = "ops_to_dev"
    system_prompt = (
        "你是一位资深开发工程师。请将以下业务需求转化为技术实现方案。\n"
        "输出应包含以下维度：\n"
        "- 技术实现方案\n"
        "- 性能与容量规划\n"
        "- 运营支撑功能设计\n"
        "- 数据监控告警需求"
    )

    def user_prompt(self, text: str) -> str:
        return f"业务需求：\n{text}\n\n请给出技术实现方案。"
