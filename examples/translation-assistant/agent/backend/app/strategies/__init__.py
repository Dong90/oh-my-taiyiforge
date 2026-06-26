from .base import TranslationStrategy
from .product_to_dev import ProductToDevStrategy
from .dev_to_product import DevToProductStrategy
from .dev_to_ops import DevToOpsStrategy
from .ops_to_dev import OpsToDevStrategy
from .product_to_ops import ProductToOpsStrategy
from .ops_to_product import OpsToProductStrategy

STRATEGY_MAP = {
    "product_to_dev": ProductToDevStrategy,
    "dev_to_product": DevToProductStrategy,
    "dev_to_ops": DevToOpsStrategy,
    "ops_to_dev": OpsToDevStrategy,
    "product_to_ops": ProductToOpsStrategy,
    "ops_to_product": OpsToProductStrategy,
}
