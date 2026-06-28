/**
 * wiring-detector.ts — Scan generated Python files and detect wiring points
 *
 * Finds routers (APIRouter), middleware (BaseHTTPMiddleware), and init/setup
 * functions so the wiring generator can produce a connected main.py.
 */

export interface RouterInfo {
  variable: string;
  modulePath: string;
  prefix?: string;
  decorators: string[];
}

export interface MiddlewareInfo {
  className: string;
  modulePath: string;
}

export interface InitInfo {
  funcName: string;
  modulePath: string;
  /** "yield" for generator-style (get_db), "direct" for setup-style (setup_tracing) */
  callStyle: "yield" | "direct";
}

export interface WiringScanResult {
  routers: RouterInfo[];
  middlewares: MiddlewareInfo[];
  inits: InitInfo[];
}

interface PyFile {
  path: string;
  content: string;
}

/** Convert filesystem path to Python module path */
function toModulePath(filePath: string): string {
  let p = filePath.replace(/\.py$/, "");
  p = p.replace(/^(?:.*\/)?app\//, "app.");
  return p.replace(/\//g, ".");
}

/** Extract the APIRouter variable name and prefix from line like `router = APIRouter(prefix="/api/v1/translation")` */
function parseRouterLine(line: string): { variable: string; prefix?: string } | null {
  const m = line.match(/^(\w+)\s*=\s*APIRouter\s*\(/);
  if (!m) return null;
  const prefixM = line.match(/prefix\s*=\s*["']([^"']+)["']/);
  return { variable: m[1], prefix: prefixM?.[1] };
}

/** Extract decorator paths like @router.post("/translate") */
function parseRouteDecorator(line: string): string | null {
  const m = line.match(/@\w+\.\w+\(["']([^"']+)["']/);
  return m?.[1] ?? null;
}

/** Check if line declares a BaseHTTPMiddleware subclass */
function parseMiddlewareClass(line: string): string | null {
  const m = line.match(/^class\s+(\w+)\s*\(.*BaseHTTPMiddleware.*\)\s*:/);
  return m?.[1] ?? null;
}

/** Check if line is a setup/init function (takes app/application/fastapi_app/web_app param or is a generator get_db style) */
function parseInitFunction(line: string, nextLines: string[]): { funcName: string; callStyle: "yield" | "direct" } | null {
  const appParams = "(?:app|application|fastapi_app|web_app)\\b";
  const setupM = line.match(new RegExp(`^def\\s+(setup_\\w+|init_\\w+)\\s*\\(\\s*${appParams}`));
  if (setupM) return { funcName: setupM[1], callStyle: "direct" };

  const genM = line.match(/^async\s+def\s+(get_\w+|create_\w+)\s*\(/);
  if (genM) {
    const tail = line.slice(line.indexOf("(")).trim();
    const joined = tail + "\n" + nextLines.join("\n");
    if (/\byield\b/.test(joined)) {
      return { funcName: genM[1], callStyle: "yield" };
    }
  }

  return null;
}

export function scanPythonModules(files: PyFile[]): WiringScanResult {
  const result: WiringScanResult = { routers: [], middlewares: [], inits: [] };

  for (const file of files) {
    if (!file.path.endsWith(".py")) continue;

    const modulePath = toModulePath(file.path);
    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const routerInfo = parseRouterLine(line);
      if (routerInfo) {
        const decorators: string[] = [];
        for (let j = i + 1; j < lines.length; j++) {
          if (/^\w+\s*=\s*APIRouter\s*\(/.test(lines[j])) break;
          if (/^(from\s+|import\s+|if\s+__name__)/.test(lines[j]) && decorators.length > 0) break;
          const route = parseRouteDecorator(lines[j]);
          if (route) decorators.push(route);
        }
        result.routers.push({
          variable: routerInfo.variable,
          modulePath,
          prefix: routerInfo.prefix,
          decorators,
        });
      }

      const mwClass = parseMiddlewareClass(line);
      if (mwClass) {
        result.middlewares.push({ className: mwClass, modulePath });
      }

      const initInfo = parseInitFunction(line, lines.slice(i + 1, i + 15));
      if (initInfo) {
        result.inits.push({ funcName: initInfo.funcName, modulePath, callStyle: initInfo.callStyle });
      }
    }
  }

  return result;
}
