"""Global exception handler that returns structured JSON errors."""
from __future__ import annotations

import logging

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse

from ..models.schemas import ErrorResponse

LOGGER = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Catches unhandled exceptions and returns a JSON error response."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ):
        try:
            return await call_next(request)
        except ValueError as exc:
            LOGGER.warning("Validation error: %s", exc)
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(detail=str(exc), error_code="VALIDATION").model_dump(),
            )
        except Exception as exc:
            LOGGER.exception("Unhandled exception processing %s %s", request.method, request.url.path)
            return JSONResponse(
                status_code=500,
                content=ErrorResponse(detail="Internal server error", error_code="INTERNAL").model_dump(),
            )
