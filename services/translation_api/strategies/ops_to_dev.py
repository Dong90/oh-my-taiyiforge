"""ops → dev: translate operations/devops language to developer language."""
from services.translation_api.strategies.base import TranslationStrategy


class OpsToDevStrategy(TranslationStrategy):
    """Translate operations language into developer-friendly terms."""

    DIRECTION = "ops_to_dev"

    def system_prompt(self) -> str:
        return (
            "You are a translation expert between operations engineers and developers. "
            "Translate the following operations message into clear, "
            "developer-oriented language. Focus on code-level changes needed, "
            "debugging guidance, and how infrastructure issues affect development work. "
            "Convert metrics, alerts, and deployment concerns into developer context."
        )

    def format_user_message(self, text: str) -> str:
        return f"Translate this operations message to developer language:\n\n{text}"
