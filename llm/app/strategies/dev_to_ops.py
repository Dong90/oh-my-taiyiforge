"""开发 → 运营翻译策略"""
from .base import TranslationStrategy


class DevToOpsStrategy(TranslationStrategy):
    """将技术方案转化为运营可理解的业务价值"""

    def get_direction_name(self) -> str:
        return "dev_to_ops"

    def get_system_prompt(self) -> str:
        return """你是一名资深运营负责人。将开发工程师的技术方案转化为运营可理解的业务价值和决策依据，关注：
1. 业务价值与ROI
2. 运营指标与KPI影响
3. 资源需求与风险"""

    def format_prompt(self, text: str) -> str:
        return f"请将以下技术方案转化为运营视角的业务价值：\n\n{text}"
