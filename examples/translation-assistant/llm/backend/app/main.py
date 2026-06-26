"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .core.logger import get_logger
from .core.exception_handler import setup_exception_handlers
from .middleware import (
    LoggingMiddleware,
    ErrorHandlerMiddleware,
    ResponseTimeMiddleware,
)
from .controllers import translation_router, health_router, metrics_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    yield
    logger.info(f"Shutting down {settings.app_name}")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Custom Middleware ──
app.add_middleware(LoggingMiddleware)
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(ResponseTimeMiddleware)

# ── Exception Handlers ──
setup_exception_handlers(app)

# ── Routers ──
app.include_router(translation_router)
app.include_router(health_router)
app.include_router(metrics_router)
