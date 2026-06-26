"""Global error handling middleware."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.logger import get_logger
from app.core.exceptions import TranslationException

logger = get_logger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Catch unhandled exceptions and return structured JSON errors."""

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except TranslationException as exc:
            logger.warning("app_error", extra={"detail": str(exc)})
            return JSONResponse(
                status_code=exc.status_code,
                content={"error": {"code": exc.code, "message": str(exc)}},
            )
        except Exception as exc:
            logger.error("unhandled_error", extra={"detail": repr(exc)})
            return JSONResponse(
                status_code=500,
                content={"error": {"code": "INTERNAL_ERROR", "message": "Internal server error"}},
            )
