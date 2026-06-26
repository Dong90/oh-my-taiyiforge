import pytest
from app.strategies.product_to_dev import ProductToDevStrategy
from app.strategies.dev_to_product import DevToProductStrategy
from app.strategies.dev_to_ops import DevToOpsStrategy
from app.strategies.ops_to_dev import OpsToDevStrategy
from app.strategies.product_to_ops import ProductToOpsStrategy
from app.strategies.ops_to_product import OpsToProductStrategy
from app.strategies import STRATEGY_MAP


class TestStrategies:
    STRATEGY_CLASSES = [
        ProductToDevStrategy,
        DevToProductStrategy,
        DevToOpsStrategy,
        OpsToDevStrategy,
        ProductToOpsStrategy,
        OpsToProductStrategy,
    ]

    @pytest.mark.parametrize("cls", STRATEGY_CLASSES)
    def test_strategy_has_name_and_direction(self, cls):
        instance = cls()
        assert instance.name
        assert instance.direction
        assert instance.system_prompt

    @pytest.mark.parametrize("cls", STRATEGY_CLASSES)
    def test_strategy_user_prompt(self, cls):
        instance = cls()
        prompt = instance.user_prompt("测试文本")
        assert "测试文本" in prompt

    def test_strategy_map_has_all_directions(self):
        expected = {
            "product_to_dev", "dev_to_product", "dev_to_ops",
            "ops_to_dev", "product_to_ops", "ops_to_product",
        }
        assert set(STRATEGY_MAP.keys()) == expected

    @pytest.mark.parametrize("direction,cls", [
        ("product_to_dev", ProductToDevStrategy),
        ("dev_to_product", DevToProductStrategy),
        ("dev_to_ops", DevToOpsStrategy),
        ("ops_to_dev", OpsToDevStrategy),
        ("product_to_ops", ProductToOpsStrategy),
        ("ops_to_product", OpsToProductStrategy),
    ])
    def test_strategy_map_routes_correctly(self, direction, cls):
        assert STRATEGY_MAP[direction] == cls
