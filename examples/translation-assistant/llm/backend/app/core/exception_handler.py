"""FastAPI exception handlers for structured error responses."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .exceptions import TranslationException
from .logger import get_logger

logger = get_logger(__name__)


def setup_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(TranslationException)
    async def translation_exception_handler(
        request: Request, exc: TranslationException
    ) -> JSONResponse:
        logger.error(
            f"TranslationException: {exc.code} - {exc.message}",
            extra={"code": exc.code, "status": exc.status_code},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": getattr(exc, "details", {}),
                }
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception(f"Unhandled exception: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred.",
                }
            },
        )
