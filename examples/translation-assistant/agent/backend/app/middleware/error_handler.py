from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from ..core import get_logger, AppException

logger = get_logger("error-handler")


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except AppException as e:
            logger.warning("app_error", extra={"code": e.code, "message": e.message})
            return JSONResponse(
                status_code=e.status_code,
                content={"error": e.message, "code": e.code},
            )
        except Exception as e:
            logger.error("unhandled_error", extra={"error": str(e)})
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error", "code": "INTERNAL_ERROR"},
            )
