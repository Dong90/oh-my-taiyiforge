import fs from "node:fs";
import path from "node:path";
import type { ArchTemplateId, ArchitectureTemplate } from "./types.js";

export const ARCH_TEMPLATES: Record<ArchTemplateId, ArchitectureTemplate> = {
  "express-3layer": {
    id: "express-3layer",
    label: "Express 3 层架构",
    minSourceFiles: 3,
    minTestFiles: 2,
    expectedDirs: ["src/routes", "src/controllers", "src/middleware", "src/store"],
    expectedPatterns: [
      { label: "错误处理中间件", grep: "error|Error|err", path: "src/middleware" },
      { label: "路由分离", grep: "Router|app\\.(get|post|put|delete)", path: "src/routes" },
    ],
    productionReadiness: {
      healthEndpoint: true,
      requiredScripts: ["start", "test", "dev"],
      corsCheck: true,
    },
    contextGuide: [
      "Express 3 层架构约定：",
      "- 路由层: src/routes/ — 每个资源一个文件，export Router (e.g. todos.js exports todoRouter)",
      "- 控制层: src/controllers/ — 解耦请求处理 (parse → call service → respond)",
      "- 存储层: src/store/ — 内存存储或数据库抽象 (Repository Pattern)",
      "- 中间件: src/middleware/ — 错误处理 / 日志 / CORS",
      "- 入口文件 src/index.js: createApp() 工厂函数 (非全局 app)，export app 用于测试",
      "- 健康检查: GET /api/health 返回 { status: 'ok' }",
      "- package.json scripts: start / dev / test 必须存在",
      "- 测试: 使用测试框架写单元测试 + 集成测试",
    ].join("\n"),
  },

  "fastapi-6layer": {
    id: "fastapi-6layer",
    label: "FastAPI 6 层架构",
    minSourceFiles: 8,
    minTestFiles: 8,
    expectedDirs: [
      "controllers", "services", "strategies",
      "adapters", "models", "config", "middleware",
    ],
    expectedPatterns: [
      { label: "配置管理", grep: "Settings|pydantic-settings|BaseSettings", path: "config" },
      { label: "依赖注入", grep: "Depends", path: "controllers" },
    ],
    productionReadiness: {
      healthEndpoint: true,
      requiredScripts: ["start", "test", "dev"],
      corsCheck: true,
    },
    contextGuide: [
      "FastAPI 6 层架构约定：",
      "- controllers/ — 路由 + 请求处理，每个文件一个 APIRouter，用 Depends 注入 service",
      "- services/ — 业务逻辑，通过构造器注入依赖",
      "- strategies/ — 策略模式 (如翻译方向策略)，基类定义接口，子类实现",
      "- adapters/ — 外部服务适配器 (如 OpenAI / Claude)，基类 + 实现",
      "- models/ — Pydantic 请求/响应模型，含字段校验",
      "- config/ — settings.py: 用 pydantic-settings，环境变量验证，禁止硬编码 API key",
      "- middleware/ — 日志 / 错误处理 / 响应时间中间件，按顺序注册",
      "- main.py: 使用 create_app() 工厂函数 + lifespan 上下文管理器 (禁全局 app 实例)",
      "- 健康检查: /health /ready /live 三个端点，ready 检查依赖服务",
      "- 路由组织: 集中式 router.py 带 prefix (api_router = APIRouter(prefix='/api'))",
      "- 测试: pytest 写每层单元测试 + 集成测试",
    ].join("\n"),
  },

  "react-component": {
    id: "react-component",
    label: "React 组件架构",
    minSourceFiles: 2,
    minTestFiles: 2,
    expectedDirs: ["src/components", "src/hooks"],
    expectedPatterns: [
      { label: "自定义 Hooks", grep: "use[A-Z]", path: "src/hooks" },
      { label: "组件 Props 类型", grep: "interface.*Props|type.*Props", path: "src/components" },
    ],
    productionReadiness: {
      requiredScripts: ["start", "test", "build"],
    },
    contextGuide: [
      "React 组件架构约定：",
      "- src/components/ — 每个组件一个文件，Props 用 TypeScript interface 定义",
      "- src/hooks/ — 自定义 Hook (useXxx 命名)，关注点分离",
      "- 组件: 函数组件 + hooks + TypeScript Prop 类型",
      "- 样式: CSS Modules 或 Tailwind，禁内联 style 对象",
      "- 测试: @testing-library/react + vitest，测渲染 + 交互 + 边界",
      "- package.json scripts: start / test / build 必须存在",
    ].join("\n"),
  },

  "generic": {
    id: "generic",
    label: "通用架构",
    minSourceFiles: 1,
    minTestFiles: 1,
    expectedDirs: [],
    expectedPatterns: [],
    productionReadiness: {
      requiredScripts: ["test"],
    },
    contextGuide: [
      "通用架构约定（无预设框架）：",
      "- 源文件按功能模块组织，避免单文件 > 250 行",
      "- 入口文件 export 工厂函数以支持测试",
      "- 测试文件与被测文件同级或放在 test/ 目录",
      "- package.json scripts: test 必须存在",
      "- 错误处理: 全局中间件或装饰器统一处理",
    ].join("\n"),
  },
};

/** detectArchTemplate: detect project type and return best-matching ArchTemplateId. */
export function detectArchTemplate(workspaceDir: string): ArchTemplateId {
  // Try package.json first (Node/React projects)
  const pkgPath = path.join(workspaceDir, "package.json");
  try {
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const names = Object.keys(allDeps);
      const hasExpress = names.some((n) => /^express/.test(n));
      const hasReact = names.some((n) => /^react/.test(n));
      if (hasExpress && !hasReact) return "express-3layer";
      if (hasReact) return "react-component";
    }
  } catch {
    /* ignore parse error — try Python detection */
  }

  // Check for Python project files (requirements.txt, setup.py, pyproject.toml)
  try {
    const pythonFiles = ["requirements.txt", "setup.py", "pyproject.toml", "Pipfile"];
    const hasPython = pythonFiles.some((f) => fs.existsSync(path.join(workspaceDir, f)));
    if (hasPython) {
      const reqTxt = path.join(workspaceDir, "requirements.txt");
      if (fs.existsSync(reqTxt) && fs.readFileSync(reqTxt, "utf8").toLowerCase().includes("fastapi")) {
        return "fastapi-6layer";
      }
    }
  } catch {
    /* ignore */
  }

  return "generic";
}

export function getArchTemplate(id: ArchTemplateId): ArchitectureTemplate {
  return ARCH_TEMPLATES[id] ?? ARCH_TEMPLATES.generic;
}
