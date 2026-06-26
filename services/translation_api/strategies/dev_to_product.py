"""dev → product: translate technical language to product/business language."""
from services.translation_api.strategies.base import TranslationStrategy


class DevToProductStrategy(TranslationStrategy):
    """Translate developer language into product-manager-friendly terms."""

    DIRECTION = "dev_to_product"

    def system_prompt(self) -> str:
        return (
            "You are a translation expert between developers and product managers. "
            "Translate the following technical/developer message into clear, "
            "business-oriented language that a product manager would understand. "
            "Focus on the business impact, timeline, and user-facing implications. "
            "Avoid jargon unless it's essential and briefly explain it."
        )

    def format_user_message(self, text: str) -> str:
        return f"Translate this developer message to product manager language:\n\n{text}"
