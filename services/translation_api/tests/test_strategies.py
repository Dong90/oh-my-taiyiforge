"""Tests for translation strategy classes."""
from __future__ import annotations

from services.translation_api.strategies import (
    DevToOpsStrategy,
    DevToProductStrategy,
    OpsToDevStrategy,
    OpsToProductStrategy,
    ProductToDevStrategy,
    ProductToOpsStrategy,
    TranslationStrategy,
)


class TestStrategies:
    """Each direction strategy should produce a distinct system prompt."""

    def _all_strategies(self) -> list[TranslationStrategy]:
        return [
            DevToProductStrategy(),
            ProductToDevStrategy(),
            DevToOpsStrategy(),
            OpsToDevStrategy(),
            ProductToOpsStrategy(),
            OpsToProductStrategy(),
        ]

    def test_direction_identifiers(self):
        """Each strategy has a unique DIRECTION assigned."""
        seen: set[str] = set()
        for s in self._all_strategies():
            assert s.DIRECTION, "DIRECTION must not be empty"
            assert s.DIRECTION not in seen, f"Duplicate direction: {s.DIRECTION}"
            seen.add(s.DIRECTION)

    def test_all_strategies_have_system_prompt(self):
        """Each strategy returns a non-empty system_prompt()."""
        for s in self._all_strategies():
            prompt = s.system_prompt()
            assert len(prompt) > 20, f"{s.DIRECTION}: system_prompt too short"

    def test_build_messages_includes_system_and_user(self):
        """build_messages returns exactly two messages (system + user)."""
        for s in self._all_strategies():
            msgs = s.build_messages("测试文本")
            assert len(msgs) == 2
            assert msgs[0]["role"] == "system"
            assert msgs[1]["role"] == "user"
            assert "测试文本" in msgs[1]["content"]

    def test_dev_to_product_contains_developer_context(self):
        """Dev→Product prompt references developer context."""
        s = DevToProductStrategy()
        prompt = s.system_prompt()
        assert "developer" in prompt.lower() or "technical" in prompt.lower()

    def test_product_to_dev_contains_product_context(self):
        """Product→Dev prompt references product context."""
        s = ProductToDevStrategy()
        prompt = s.system_prompt()
        assert "product" in prompt.lower() or "business" in prompt.lower()
