import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from ..core import get_logger

logger = get_logger("timing")


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration_ms = (time.time() - start) * 1000
        response.headers["X-Response-Time"] = f"{duration_ms:.1f}ms"
        logger.info("timing", extra={"method": request.method, "path": request.url.path, "duration_ms": round(duration_ms, 1)})
        return response
