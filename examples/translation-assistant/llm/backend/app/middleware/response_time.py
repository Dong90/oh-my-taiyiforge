"""Response time tracking middleware — adds X-Response-Time header."""

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class ResponseTimeMiddleware(BaseHTTPMiddleware):
    """Add X-Response-Time header (in ms) to every response."""

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 1)
        response.headers["X-Response-Time"] = str(duration_ms)
        return response
