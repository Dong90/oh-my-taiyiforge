"""Strategy registry — maps direction names to strategy instances."""

from .base import TranslationStrategy
from .product_to_dev import ProductToDevStrategy
from .dev_to_product import DevToProductStrategy
from .dev_to_ops import DevToOpsStrategy
from .ops_to_dev import OpsToDevStrategy
from .product_to_ops import ProductToOpsStrategy
from .ops_to_product import OpsToProductStrategy

STRATEGY_MAP: dict[str, TranslationStrategy] = {
    s.name: s()
    for s in [
        ProductToDevStrategy,
        DevToProductStrategy,
        DevToOpsStrategy,
        OpsToDevStrategy,
        ProductToOpsStrategy,
        OpsToProductStrategy,
    ]
}

__all__ = [
    "TranslationStrategy",
    "STRATEGY_MAP",
    "ProductToDevStrategy",
    "DevToProductStrategy",
    "DevToOpsStrategy",
    "OpsToDevStrategy",
    "ProductToOpsStrategy",
    "OpsToProductStrategy",
]
