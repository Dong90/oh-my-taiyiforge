from abc import ABC, abstractmethod


class LLMAdapter(ABC):
    @abstractmethod
    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        """Send prompt to LLM and return completion."""
        pass
