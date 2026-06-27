"""Tests for all 6 translation strategies."""

import pytest
from app.strategies import STRATEGY_MAP


class TestStrategyRegistration:
    def test_all_six_strategies_registered(self):
        assert len(STRATEGY_MAP) == 6

    def test_expected_directions(self):
        expected = {
            "product_to_dev",
            "dev_to_product",
            "dev_to_ops",
            "ops_to_dev",
            "product_to_ops",
            "ops_to_product",
        }
        assert set(STRATEGY_MAP.keys()) == expected


class TestStrategyBehavior:
    @pytest.mark.parametrize("name", list(STRATEGY_MAP.keys()))
    def test_each_strategy_has_name(self, name):
        strategy = STRATEGY_MAP[name]
        assert strategy.name == name

    @pytest.mark.parametrize("name", list(STRATEGY_MAP.keys()))
    def test_each_strategy_has_system_prompt(self, name):
        strategy = STRATEGY_MAP[name]
        prompt = strategy.get_system_prompt()
        assert isinstance(prompt, str)
        assert len(prompt) >= 50

    @pytest.mark.parametrize("name", list(STRATEGY_MAP.keys()))
    def test_each_strategy_formats_prompt(self, name):
        strategy = STRATEGY_MAP[name]
        formatted = strategy.format_prompt("测试输入文本")
        assert isinstance(formatted, str)
        assert "测试输入文本" in formatted
