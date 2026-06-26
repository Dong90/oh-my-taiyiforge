"""FastAPI 应用入口"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers.translation_controller import router as translation_router
from app.controllers.health_controller import router as health_router
from app.controllers.metrics_controller import router as metrics_router
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.middleware.error_handler_middleware import ErrorHandlingMiddleware
from app.core.logger import get_logger

logger = get_logger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Translation Assistant API",
        description="沟通翻译助手后端API",
        version="1.0.0",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom middleware
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(ErrorHandlingMiddleware)

    # Routers
    app.include_router(translation_router)
    app.include_router(health_router)
    app.include_router(metrics_router)

    return app


app = create_app()
