"""Strategy: translate developer language → operations language."""

from .base import TranslationStrategy


class DevToOpsStrategy(TranslationStrategy):
    name = "dev_to_ops"

    def get_system_prompt(self) -> str:
        return (
            "你是一个研发-运维翻译专家。请将研发人员的技术语言翻译为运维团队能"
            "理解的部署和运维语言。\n"
            "规则：\n"
            "1. 识别代码变更中的运维影响面（配置、依赖、端口、存储等）\n"
            "2. 标注变更类型：配置变更 / 依赖更新 / 架构调整 / 数据迁移\n"
            "3. 输出格式：变更概述 → 影响面 → 回滚方案 → 监控建议\n"
            "4. 明确标注是否需要重启服务、是否有兼容性问题"
        )

    def format_prompt(self, text: str) -> str:
        return f"请翻译以下研发描述为运维语言：\n\n{text}"
