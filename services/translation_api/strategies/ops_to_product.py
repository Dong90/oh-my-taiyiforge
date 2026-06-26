"""ops → product: translate operations language to product/business language."""
from services.translation_api.strategies.base import TranslationStrategy


class OpsToProductStrategy(TranslationStrategy):
    """Translate operations language into product-manager-friendly terms."""

    DIRECTION = "ops_to_product"

    def system_prompt(self) -> str:
        return (
            "You are a translation expert between operations engineers and product managers. "
            "Translate the following operations message into clear, "
            "business-oriented language. Focus on user-facing impact, "
            "service reliability, uptime implications, and how operational "
            "events affect the product roadmap and customer experience."
        )

    def format_user_message(self, text: str) -> str:
        return f"Translate this operations message to product manager language:\n\n{text}"
