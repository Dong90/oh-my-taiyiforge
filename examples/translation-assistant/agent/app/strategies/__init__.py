"""翻译策略模块 - 策略模式实现"""
from .base import TranslationStrategy
from .product_to_dev import ProductToDevStrategy
from .dev_to_product import DevToProductStrategy
from .dev_to_ops import DevToOpsStrategy
from .ops_to_dev import OpsToDevStrategy
from .product_to_ops import ProductToOpsStrategy
from .ops_to_product import OpsToProductStrategy

__all__ = [
    'TranslationStrategy',
    'ProductToDevStrategy',
    'DevToProductStrategy',
    'DevToOpsStrategy',
    'OpsToDevStrategy',
    'ProductToOpsStrategy',
    'OpsToProductStrategy'
]
