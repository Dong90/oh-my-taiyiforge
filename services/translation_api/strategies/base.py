"""Abstract translation strategy — one subclass per direction."""
from __future__ import annotations

from abc import ABC, abstractmethod


class TranslationStrategy(ABC):
    """Base class for role-role translation strategies.

    Each concrete subclass knows:
    - Which ``from_role``→``to_role`` direction it handles.
    - The system prompt that sets the LLM context for that direction.
    - How to format the user message (wrapping / prefixing the source
      text so the LLM understands the role context).
    """

    DIRECTION: str = ""  # e.g. "dev_to_product" — overridden by subclasses

    @abstractmethod
    def system_prompt(self) -> str:
        """Return the system-level instruction for this direction."""

    def format_user_message(self, text: str) -> str:
        """Wrap the source text in a role-aware user message."""
        return text

    def build_messages(self, text: str) -> list[dict[str, str]]:
        """Return the full message list (system + user) for the LLM call."""
        return [
            {"role": "system", "content": self.system_prompt()},
            {"role": "user", "content": self.format_user_message(text)},
        ]
