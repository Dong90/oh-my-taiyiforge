"""统一错误处理中间件"""
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from ..core.exceptions import AppException
from ..core.logger import get_logger

logger = get_logger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """统一异常处理中间件"""

    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except AppException as e:
            logger.warning(
                "App exception", error_code=e.error_code, message=str(e)
            )
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "error_code": e.error_code,
                    "message": str(e),
                },
            )
        except Exception as e:
            logger.error("Unhandled exception", exc_info=e)
            return JSONResponse(
                status_code=500,
                content={
                    "error_code": "INTERNAL_ERROR",
                    "message": "Internal server error",
                },
            )
