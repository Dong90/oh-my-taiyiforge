from abc import ABC, abstractmethod
from typing import ClassVar


class TranslationStrategy(ABC):
    name: ClassVar[str] = ""
    direction: ClassVar[str] = ""
    system_prompt: ClassVar[str] = ""

    @abstractmethod
    def user_prompt(self, text: str) -> str:
        pass

    def get_system_prompt(self) -> str:
        return self.system_prompt
