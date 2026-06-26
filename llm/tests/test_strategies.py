"""策略测试"""
import pytest
from app.strategies.product_to_dev import ProductToDevStrategy
from app.strategies.dev_to_product import DevToProductStrategy
from app.strategies.dev_to_ops import DevToOpsStrategy
from app.strategies.ops_to_dev import OpsToDevStrategy
from app.strategies.product_to_ops import ProductToOpsStrategy
from app.strategies.ops_to_product import OpsToProductStrategy


class TestStrategies:
    """翻译策略测试"""

    def test_product_to_dev_prompt(self):
        strategy = ProductToDevStrategy()
        assert strategy.get_direction_name() == "product_to_dev"
        prompt = strategy.format_prompt("测试文本")
        assert "测试文本" in prompt
        assert "产品需求" in prompt

    def test_dev_to_product_prompt(self):
        strategy = DevToProductStrategy()
        assert strategy.get_direction_name() == "dev_to_product"
        prompt = strategy.format_prompt("测试文本")
        assert "技术方案" in prompt

    def test_dev_to_ops_prompt(self):
        strategy = DevToOpsStrategy()
        assert strategy.get_direction_name() == "dev_to_ops"
        prompt = strategy.format_prompt("测试文本")
        assert "技术方案" in prompt

    def test_ops_to_dev_prompt(self):
        strategy = OpsToDevStrategy()
        assert strategy.get_direction_name() == "ops_to_dev"
        prompt = strategy.format_prompt("测试文本")

    def test_product_to_ops_prompt(self):
        strategy = ProductToOpsStrategy()
        assert strategy.get_direction_name() == "product_to_ops"

    def test_ops_to_product_prompt(self):
        strategy = OpsToProductStrategy()
        assert strategy.get_direction_name() == "ops_to_product"

    def test_all_strategies_have_system_prompt(self):
        strategies = [
            ProductToDevStrategy(),
            DevToProductStrategy(),
            DevToOpsStrategy(),
            OpsToDevStrategy(),
            ProductToOpsStrategy(),
            OpsToProductStrategy(),
        ]
        for s in strategies:
            assert len(s.get_system_prompt()) > 0, f"{s.get_direction_name()} missing system prompt"
