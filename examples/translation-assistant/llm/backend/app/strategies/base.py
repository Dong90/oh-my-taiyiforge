"""Abstract base class for all translation strategies."""

from abc import ABC, abstractmethod


class TranslationStrategy(ABC):
    """Strategy pattern: each translation direction has its own strategy."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique strategy identifier, e.g. product_to_dev."""

    @abstractmethod
    def get_system_prompt(self) -> str:
        """System prompt that defines the AI's role and output format."""

    @abstractmethod
    def format_prompt(self, user_input: str) -> str:
        """Format the user's input into the full prompt for the LLM."""
