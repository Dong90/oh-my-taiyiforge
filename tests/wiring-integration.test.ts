import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { scanPythonModules } from "../src/core/wiring-detector.js";
import { generateWiring } from "../src/core/wiring-generator.js";
import { allocateWaves } from "../src/core/wave-allocator.js";

describe("wiring integration (end-to-end)", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-wiring-test-"));

  it("1. full pipeline: allocateWaves → scan → generate → valid Python", () => {
    const changes = [
      { slug: "data-layer", dependsOn: [] },
      { slug: "observability", dependsOn: [] },
      { slug: "cache", dependsOn: [] },
      { slug: "api-polish", dependsOn: [] },
      { slug: "security", dependsOn: ["data-layer"] },
      { slug: "tests", dependsOn: ["data-layer", "security"] },
    ];

    // Step 2: Wave allocation with new WaveGroup API
    const waves = allocateWaves(changes, 5);
    expect(waves[0].label).toBe("Wave 1");
    expect(waves[0].changes).toHaveLength(4);
    expect(waves[1].label).toBe("Wave 2");
    expect(waves[1].changes.map((c) => c.slug)).toEqual(["security"]);
    expect(waves[2].label).toBe("Wave 3");
    expect(waves[2].changes.map((c) => c.slug)).toEqual(["tests"]);

    // Step 3: Create real .py files on disk
    const appDir = path.join(tmpDir, "backend", "app");
    fs.mkdirSync(path.join(appDir, "controllers"), { recursive: true });
    fs.mkdirSync(path.join(appDir, "controllers", "v1"), { recursive: true });
    fs.mkdirSync(path.join(appDir, "middleware"), { recursive: true });
    fs.mkdirSync(path.join(appDir, "db"), { recursive: true });

    fs.writeFileSync(path.join(appDir, "controllers", "v1", "translation.py"), `
from fastapi import APIRouter
router = APIRouter(prefix="/api/v1/translation")
@router.post("/translate")
async def translate(): return {"ok": True}
`);

    fs.writeFileSync(path.join(appDir, "controllers", "auth.py"), `
from fastapi import APIRouter
router = APIRouter(prefix="/api/v1/auth")
@router.post("/login")
async def login(): return {"token": "x"}
`);

    fs.writeFileSync(path.join(appDir, "middleware", "metrics_mw.py"), `
from starlette.middleware.base import BaseHTTPMiddleware
class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next): return await call_next(request)
`);

    fs.writeFileSync(path.join(appDir, "middleware", "auth_mw.py"), `
from starlette.middleware.base import BaseHTTPMiddleware
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next): return await call_next(request)
`);

    fs.writeFileSync(path.join(appDir, "db", "engine.py"), `
async def get_db(): yield None
`);

    // Step 4: Scan
    const pyFiles = execSync(`find ${appDir} -name "*.py" -type f`, { encoding: "utf8" })
      .trim().split("\n").filter(Boolean);
    const files = pyFiles.map((f) => ({
      path: path.relative(tmpDir, f),
      content: fs.readFileSync(f, "utf8"),
    }));
    const scan = scanPythonModules(files);
    expect(scan.routers).toHaveLength(2);
    expect(scan.middlewares).toHaveLength(2);
    expect(scan.inits).toHaveLength(1);

    // Step 5: Generate wiring
    const wiringCode = generateWiring(scan);
    const wiringPath = path.join(appDir, "wiring.py");
    fs.writeFileSync(wiringPath, wiringCode, "utf8");

    // Step 6: Verify AUTO-GENERATED marker
    expect(wiringCode).toContain("AUTO-GENERATED");

    // Step 7: Valid Python syntax
    try {
      execSync(`python3 -c "
import ast, sys
with open('${wiringPath}') as f:
    ast.parse(f.read())
print('syntax ok')
"`, { encoding: "utf8", stdio: "pipe", timeout: 10000 });
    } catch (e: any) {
      expect.fail(`wiring.py has invalid Python syntax: ${e.stderr ?? e.message}`);
    }

    // Step 8: Full-path aliases (collision-proof)
    expect(wiringCode).toContain("app_controllers_auth_router");
    expect(wiringCode).toContain("app_controllers_v1_translation_router");
    expect(wiringCode).toContain("app.add_middleware(MetricsMiddleware)");
    expect(wiringCode).toContain("app.add_middleware(AuthMiddleware)");
    expect(wiringCode).toContain("lifespan");

    // Step 9: Middleware order (metrics before auth)
    const metricsPos = wiringCode.indexOf("MetricsMiddleware");
    const authPos = wiringCode.indexOf("AuthMiddleware");
    expect(metricsPos).toBeLessThan(authPos);

    // Step 10: Overwrite guard — re-writing should be OK (marker present)
    fs.writeFileSync(wiringPath, wiringCode, "utf8");
    const reRead = fs.readFileSync(wiringPath, "utf8");
    expect(reRead).toContain("AUTO-GENERATED");
  });
});
