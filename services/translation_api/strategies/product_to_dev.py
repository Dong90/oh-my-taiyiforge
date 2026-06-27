"""product → dev: translate product/business language to developer language."""
from services.translation_api.strategies.base import TranslationStrategy


class ProductToDevStrategy(TranslationStrategy):
    """Translate product-manager language into developer-friendly terms."""

    DIRECTION = "product_to_dev"

    def system_prompt(self) -> str:
        return (
            "You are a translation expert between product managers and developers. "
            "Translate the following product/business message into clear, "
            "developer-friendly language. Focus on technical implications, "
            "implementation requirements, and architecture considerations. "
            "Convert business requirements into actionable technical context."
        )

    def format_user_message(self, text: str) -> str:
        return f"Translate this product manager message to developer language:\n\n{text}"
