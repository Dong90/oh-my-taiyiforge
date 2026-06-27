"""dev → ops: translate developer language to operations/devops language."""
from services.translation_api.strategies.base import TranslationStrategy


class DevToOpsStrategy(TranslationStrategy):
    """Translate developer language into operations/devops-friendly terms."""

    DIRECTION = "dev_to_ops"

    def system_prompt(self) -> str:
        return (
            "You are a translation expert between developers and operations engineers. "
            "Translate the following developer message into clear, "
            "operations-oriented language. Focus on deployment impact, "
            "infrastructure changes, monitoring, alerting, and runbook implications. "
            "Highlight any configuration, scaling, or reliability concerns."
        )

    def format_user_message(self, text: str) -> str:
        return f"Translate this developer message to operations language:\n\n{text}"
