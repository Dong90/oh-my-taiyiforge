"""统一异常处理器"""
from fastapi import Request
from fastapi.responses import JSONResponse
from .exceptions import AppException
from .logger import get_logger

logger = get_logger(__name__)


async def app_exception_handler(request: Request, exc: AppException):
    logger.warning("App exception", error_code=exc.error_code, message=exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
        },
    )


async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "INTERNAL_ERROR",
            "message": "Internal server error",
        },
    )
