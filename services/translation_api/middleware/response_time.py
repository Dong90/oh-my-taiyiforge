"""Adds a ``X-Response-Time`` header to every response."""
from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class ResponseTimeMiddleware(BaseHTTPMiddleware):
    """Injects an ``X-Response-Time`` header with the duration in milliseconds."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        elapsed_ms = (time.monotonic() - start) * 1000
        response.headers["X-Response-Time"] = f"{elapsed_ms:.1f}ms"
        return response
