import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from ..core import get_logger, set_request_id

logger = get_logger("middleware")


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        set_request_id(rid)
        logger.info("request", extra={"method": request.method, "path": request.url.path})
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response
