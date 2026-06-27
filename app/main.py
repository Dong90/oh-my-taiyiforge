from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.config.settings import settings
from app.core.exceptions import AppError
from app.core.logging import setup_logging
from app.middleware.cors import setup_cors
from app.middleware.error_handler import app_error_handler, generic_error_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    yield


app = FastAPI(title="TaiyiForge Translation Assistant", version="0.1.0", lifespan=lifespan)

setup_cors(app)
app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, generic_error_handler)  # type: ignore[arg-type]
app.include_router(router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
