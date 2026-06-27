from .health_controller import router as health_router
from .translation_controller import router as translation_router
from .metrics_controller import router as metrics_router

__all__ = ["health_router", "translation_router", "metrics_router"]
