from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .controllers import health_router, translation_router, metrics_router
from .middleware import LoggingMiddleware, ErrorHandlerMiddleware, TimingMiddleware

app = FastAPI(title="Translation Assistant", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)
app.add_middleware(TimingMiddleware)
app.add_middleware(ErrorHandlerMiddleware)

app.include_router(health_router)
app.include_router(translation_router)
app.include_router(metrics_router)
