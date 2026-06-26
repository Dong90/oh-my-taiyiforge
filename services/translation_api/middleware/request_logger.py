"""Logs every request with method, path, status, and duration."""
from __future__ import annotations

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

LOGGER = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs the method, path, status code and duration."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        elapsed = time.monotonic() - start
        LOGGER.info(
            "%s %s → %d (%.2fms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed * 1000,
        )
        return response
