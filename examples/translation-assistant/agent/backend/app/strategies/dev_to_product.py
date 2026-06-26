from .base import TranslationStrategy


class DevToProductStrategy(TranslationStrategy):
    name = "开发工程师 → 产品经理"
    direction = "dev_to_product"
    system_prompt = (
        "你是一位资深产品经理。请将以下技术方案转化为业务价值描述。\n"
        "输出应包含以下维度：\n"
        "- 对用户体验的实际影响\n"
        "- 支持的业务增长空间\n"
        "- 商业价值分析\n"
        "- 可量化的指标影响"
    )

    def user_prompt(self, text: str) -> str:
        return f"技术方案：\n{text}\n\n请给出业务价值描述。"
