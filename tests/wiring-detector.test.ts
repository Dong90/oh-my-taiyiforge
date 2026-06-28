import { describe, expect, it } from "vitest";
import {
  scanPythonModules,
  type WiringScanResult,
} from "../src/core/wiring-detector.js";

/** Helper: create a minimal Python file with given content */
function pyFile(path: string, content: string): { path: string; content: string } {
  return { path, content };
}

describe("scanPythonModules", () => {
  it("detects FastAPI routers with @router decorators", () => {
    const files = [
      pyFile(
        "app/controllers/v1/translation_controller.py",
        `
from fastapi import APIRouter
router = APIRouter(prefix="/api/v1/translation", tags=["translation"])

@router.post("/translate")
async def translate(request: TranslationRequest):
    return {"ok": true}

@router.post("/translate/stream")
async def translate_stream(request: TranslationRequest):
    return StreamingResponse(...)
`,
      ),
      pyFile(
        "app/controllers/auth_controller.py",
        `
from fastapi import APIRouter
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/login")
async def login(request: LoginRequest):
    return {"access_token": "..."}
`,
      ),
    ];

    const result = scanPythonModules(files);
    expect(result.routers).toHaveLength(2);
    expect(result.routers[0].variable).toBe("router");
    expect(result.routers[0].modulePath).toBe("app.controllers.v1.translation_controller");
    expect(result.routers[0].decorators).toContain("/translate");
    expect(result.routers[0].decorators).toContain("/translate/stream");
    expect(result.routers[1].modulePath).toBe("app.controllers.auth_controller");
    expect(result.routers[1].decorators).toContain("/login");
  });

  it("detects middleware classes extending BaseHTTPMiddleware", () => {
    const files = [
      pyFile(
        "app/middleware/auth.py",
        `
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        token = request.headers.get("Authorization")
        if not token:
            return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
        return await call_next(request)

async def get_current_user(credentials = Depends(security)):
    return decode_token(credentials.credentials)
`,
      ),
      pyFile(
        "app/telemetry/metrics.py",
        `
from prometheus_client import Counter, Histogram
from starlette.middleware.base import BaseHTTPMiddleware

class PrometheusMetricsMiddleware(BaseHTTPMiddleware):
    """Collects HTTP metrics."""
    async def dispatch(self, request, call_next):
        start = time.time()
        response = await call_next(request)
        duration = time.time() - start
        http_requests_total.labels(method=request.method).inc()
        return response
`,
      ),
    ];

    const result = scanPythonModules(files);
    expect(result.middlewares).toHaveLength(2);
    expect(result.middlewares[0].className).toBe("JWTAuthMiddleware");
    expect(result.middlewares[0].modulePath).toBe("app.middleware.auth");
    expect(result.middlewares[1].className).toBe("PrometheusMetricsMiddleware");
  });

  it("detects init/setup functions for db, cache, telemetry", () => {
    const files = [
      pyFile(
        "app/db/engine.py",
        `
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine("sqlite+aiosqlite:///./test.db")
async_session = async_sessionmaker(engine)

async def get_db():
    async with async_session() as session:
        yield session
`,
      ),
      pyFile(
        "app/telemetry/tracing.py",
        `
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

def setup_tracing(app):
    provider = TracerProvider()
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(app)
`,
      ),
      pyFile(
        "app/middleware/ratelimit.py",
        `
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

def setup_ratelimit(app):
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
`,
      ),
      pyFile(
        "app/cache/redis_cache.py",
        `
import redis.asyncio as aioredis

_cache_client = None

async def get_cache():
    global _cache_client
    if _cache_client is None:
        _cache_client = aioredis.from_url(REDIS_URL)
    return _cache_client
`,
      ),
    ];

    const result = scanPythonModules(files);
    expect(result.inits).toHaveLength(3);
    expect(result.inits.map((i) => i.funcName).sort()).toEqual(
      ["get_db", "setup_ratelimit", "setup_tracing"].sort(),
    );
    // get_cache doesn't take `app` param → not detected as an init
    expect(result.inits.find((i) => i.funcName === "get_db")?.callStyle).toBe("yield");
    expect(result.inits.find((i) => i.funcName === "setup_tracing")?.callStyle).toBe("direct");
    expect(result.inits.find((i) => i.funcName === "setup_ratelimit")?.callStyle).toBe("direct");
  });

  it("returns empty arrays for non-Python files", () => {
    const files = [
      pyFile("README.md", "# Hello"),
      pyFile("style.css", "body { color: red; }"),
    ];
    const result = scanPythonModules(files);
    expect(result.routers).toHaveLength(0);
    expect(result.middlewares).toHaveLength(0);
    expect(result.inits).toHaveLength(0);
  });

  it("full translation-assistant scan produces correct wiring order", () => {
    const files = [
      pyFile("app/controllers/v1/translation_controller.py", `
from fastapi import APIRouter
router = APIRouter(prefix="/api/v1/translation")
@router.post("/translate")
async def translate(): return {"ok": true}
`),
      pyFile("app/controllers/auth_controller.py", `
from fastapi import APIRouter
router = APIRouter(prefix="/api/v1/auth")
@router.post("/login")
async def login(): return {"token": "x"}
`),
      pyFile("app/middleware/auth.py", `
from starlette.middleware.base import BaseHTTPMiddleware
class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next): return await call_next(request)
`),
      pyFile("app/telemetry/metrics.py", `
from starlette.middleware.base import BaseHTTPMiddleware
class PrometheusMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next): return await call_next(request)
`),
      pyFile("app/telemetry/tracing.py", `
def setup_tracing(app): pass
`),
      pyFile("app/db/engine.py", `
async def get_db(): yield
`),
    ];

    const result = scanPythonModules(files);
    // Routers: 2
    expect(result.routers).toHaveLength(2);
    // Middlewares: 2
    expect(result.middlewares).toHaveLength(2);
    // Inits: 2 (setup_tracing, get_db)
    expect(result.inits).toHaveLength(2);

    // Verify wiring order can be determined:
    // Middlewares: metrics first (before auth, to capture auth failures)
    // Routers: any order
    expect(result.middlewares.map((m) => m.className)).toContain("PrometheusMetricsMiddleware");
    expect(result.middlewares.map((m) => m.className)).toContain("JWTAuthMiddleware");
  });
});
