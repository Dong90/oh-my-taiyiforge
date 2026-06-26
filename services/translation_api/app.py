"""FastAPI application factory."""
from __future__ import annotations

import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import ConfigError, get_settings
from .controllers import router as api_router
from .middleware.error_handler import ErrorHandlingMiddleware
from .middleware.request_logger import RequestLoggingMiddleware
from .middleware.response_time import ResponseTimeMiddleware
from .services import LLMService, TranslationService
from .adapters.openai import OpenAIAdapter

LOGGER = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Build and return a configured FastAPI application instance."""
    settings = get_settings()

    app = FastAPI(
        title="Translation Assistant API",
        description="沟通翻译助手 — backend API for role-aware LLM translation",
        version="1.0.0",
    )

    # ── Middleware (order matters: outer = first) ────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(ErrorHandlingMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(ResponseTimeMiddleware)

    # ── Routes ──────────────────────────────────────────────────────────
    app.include_router(api_router)

    # ── Services (inject into app.state) ────────────────────────────────
    adapter = OpenAIAdapter()
    llm_service = LLMService(adapter)
    translation_service = TranslationService(llm_service)
    app.state.translation_service = translation_service

    return app


def main() -> None:
    """Entry point for ``python -m services.translation_api``."""
    logging.basicConfig(
        level=get_settings().LOG_LEVEL,
        format="%(asctime)s %(levelname)-7s %(name)s %(message)s",
    )

    try:
        settings = get_settings()
    except ConfigError as exc:
        LOGGER.critical("Configuration error: %s", exc)
        raise SystemExit(1) from exc

    app_ = create_app()
    LOGGER.info("Starting server on %s:%d", settings.APP_HOST, settings.APP_PORT)
    uvicorn.run(
        app_,
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        log_level=settings.LOG_LEVEL.lower(),
    )


if __name__ == "__main__":
    main()
