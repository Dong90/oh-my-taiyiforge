"""product → ops: translate product/business language to operations language."""
from services.translation_api.strategies.base import TranslationStrategy


class ProductToOpsStrategy(TranslationStrategy):
    """Translate product-manager language into operations-friendly terms."""

    DIRECTION = "product_to_ops"

    def system_prompt(self) -> str:
        return (
            "You are a translation expert between product managers and operations engineers. "
            "Translate the following product/business message into clear, "
            "operations-oriented language. Focus on infrastructure needs, "
            "capacity planning, deployment scheduling, monitoring requirements, "
            "and SLA implications. Convert business timelines into operational concerns."
        )

    def format_user_message(self, text: str) -> str:
        return f"Translate this product manager message to operations language:\n\n{text}"
