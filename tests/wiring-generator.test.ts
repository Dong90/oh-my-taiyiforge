import { describe, expect, it } from "vitest";
import { generateWiring } from "../src/core/wiring-generator.js";
import type { WiringScanResult } from "../src/core/wiring-detector.js";

describe("generateWiring", () => {
  const minimal: WiringScanResult = {
    routers: [
      {
        variable: "router",
        modulePath: "app.controllers.v1.translation_controller",
        prefix: "/api/v1/translation",
        decorators: ["/translate", "/translate/stream"],
      },
    ],
    middlewares: [],
    inits: [],
  };

  it("generates import with full-path alias to avoid collisions", () => {
    const code = generateWiring(minimal);
    expect(code).toContain("AUTO-GENERATED");
    expect(code).toContain(
      "from app.controllers.v1.translation_controller import router as app_controllers_v1_translation_controller_router",
    );
    expect(code).toContain("app.include_router(app_controllers_v1_translation_controller_router)");
  });

  it("generates middleware registrations in correct order", () => {
    const scan: WiringScanResult = {
      routers: [],
      middlewares: [
        { className: "JWTAuthMiddleware", modulePath: "app.middleware.auth" },
        { className: "PrometheusMetricsMiddleware", modulePath: "app.telemetry.metrics" },
      ],
      inits: [],
    };
    const code = generateWiring(scan);
    const metricsIdx = code.indexOf("PrometheusMetricsMiddleware");
    const authIdx = code.indexOf("JWTAuthMiddleware");
    expect(metricsIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeGreaterThan(metricsIdx);
  });

  it("generates configured middleware with production warning for known classes", () => {
    const scan: WiringScanResult = {
      routers: [],
      middlewares: [
        { className: "CORSMiddleware", modulePath: "fastapi.middleware.cors" },
      ],
      inits: [],
    };
    const code = generateWiring(scan);
    expect(code).toContain("allow_origins");
    expect(code).toContain("restrict origins in production");
  });

  it("generates init function calls for setup-style inits", () => {
    const scan: WiringScanResult = {
      routers: [],
      middlewares: [],
      inits: [
        { funcName: "setup_tracing", modulePath: "app.telemetry.tracing", callStyle: "direct" },
      ],
    };
    const code = generateWiring(scan);
    expect(code).toContain("from app.telemetry.tracing import setup_tracing");
    expect(code).toContain("setup_tracing(app)");
  });

  it("generates lifespan wrapper for generator-style inits (get_db)", () => {
    const scan: WiringScanResult = {
      routers: [],
      middlewares: [],
      inits: [
        { funcName: "get_db", modulePath: "app.db.engine", callStyle: "yield" },
      ],
    };
    const code = generateWiring(scan);
    expect(code).toContain("from contextlib import asynccontextmanager");
    expect(code).toContain("async def lifespan(app: FastAPI)");
    expect(code).toContain("async with get_db()");
    expect(code).toContain("yield");
  });

  it("generates nested lifespan for multiple generator inits", () => {
    const scan: WiringScanResult = {
      routers: [],
      middlewares: [],
      inits: [
        { funcName: "get_db", modulePath: "app.db.engine", callStyle: "yield" },
        { funcName: "get_cache", modulePath: "app.cache.redis_cache", callStyle: "yield" },
      ],
    };
    const code = generateWiring(scan);
    // Both inits should appear
    const dbPos = code.indexOf("get_db");
    const cachePos = code.indexOf("get_cache");
    expect(dbPos).toBeGreaterThan(-1);
    expect(cachePos).toBeGreaterThan(dbPos);
    // Only one yield (at the innermost level)
    expect((code.match(/\byield\b/g) ?? []).length).toBe(1);
  });

  it("full wiring combines routers + middlewares + inits", () => {
    const scan: WiringScanResult = {
      routers: [
        {
          variable: "router",
          modulePath: "app.controllers.v1.translation_controller",
          decorators: ["/translate"],
        },
        {
          variable: "router",
          modulePath: "app.controllers.auth_controller",
          decorators: ["/login"],
        },
      ],
      middlewares: [
        { className: "PrometheusMetricsMiddleware", modulePath: "app.telemetry.metrics" },
      ],
      inits: [
        { funcName: "setup_tracing", modulePath: "app.telemetry.tracing", callStyle: "direct" },
        { funcName: "get_db", modulePath: "app.db.engine", callStyle: "yield" },
      ],
    };
    const code = generateWiring(scan);

    expect(code).toContain("AUTO-GENERATED");
    expect(code).toContain("from app.controllers.v1.translation_controller");
    expect(code).toContain("from app.controllers.auth_controller");
    expect(code).toContain("from app.telemetry.metrics");
    expect(code).toContain("app.add_middleware(PrometheusMetricsMiddleware)");
    expect(code).toContain("app.include_router(app_controllers_v1_translation_controller_router)");
    expect(code).toContain("app.include_router(app_controllers_auth_controller_router)");
  });
});
