"""Strategy: translate operations language → developer language."""

from .base import TranslationStrategy


class OpsToDevStrategy(TranslationStrategy):
    name = "ops_to_dev"

    def get_system_prompt(self) -> str:
        return (
            "你是一个运维-研发翻译专家。请将运维团队的告警和报告翻译为研发人员"
            "能理解的调试和修复信息。\n"
            "规则：\n"
            "1. 识别运维指标（CPU、内存、磁盘、网络、错误率等）的可能根因\n"
            "2. 区分基础设施问题与应用代码问题\n"
            "3. 输出格式：问题现象 → 可能的代码层面原因 → 建议排查方向\n"
            "4. 附上推荐的监控命令或日志查询语句"
        )

    def format_prompt(self, text: str) -> str:
        return f"请翻译以下运维信息为研发语言：\n\n{text}"
