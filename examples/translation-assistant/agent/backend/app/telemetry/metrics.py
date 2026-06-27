"""Prometheus metrics middleware."""
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.requests import Request
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
import time

http_requests_total = Counter("http_requests_total", "Total HTTP requests", ["method", "path", "status"])
http_request_duration_seconds = Histogram("http_request_duration_seconds", "HTTP request duration")
http_errors_total = Counter("http_errors_total", "Total HTTP errors", ["method", "path"])

class PrometheusMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration = time.time() - start
        path = request.url.path
        http_requests_total.labels(method=request.method, path=path, status=response.status_code).inc()
        http_request_duration_seconds.observe(duration)
        if response.status_code >= 500:
            http_errors_total.labels(method=request.method, path=path).inc()
        return response

async def metrics_endpoint(request: Request):
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
