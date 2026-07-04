import type { HarnessHook } from "./harness-hooks.js";
import { detectProjectTechStack, type DetectedLanguage, type DetectedFramework, type DetectedInfra, type DetectedDb, type DetectedTest } from "./project-detect.js";

export { detectProjectTechStack as detectStack };
export { type DetectedLanguage, type DetectedFramework, type DetectedInfra, type DetectedDb, type DetectedTest };

type Def = { skill: string; phases: string[]; when: string };

// ── framework ECC hooks ──

const FRAMEWORK_HOOKS: Record<DetectedFramework, Def[]> = {
  react: [{ skill: "react-patterns", phases: ["ui-design", "dev"], when: "React 模式 + hooks + 状态管理" }],
  vue: [{ skill: "vue-patterns", phases: ["ui-design", "dev"], when: "Vue 3 Composition API + Pinia" }],
  angular: [{ skill: "angular-patterns", phases: ["ui-design", "dev"], when: "Angular DI + RxJS + 模块模式" }],
  nextjs: [{ skill: "nextjs-patterns", phases: ["ui-design", "dev"], when: "Next.js App Router + RSC + ISR 模式" }],
  svelte: [{ skill: "svelte-patterns", phases: ["ui-design", "dev"], when: "Svelte 5 runes + stores 模式" }],
  nuxt: [{ skill: "nuxt-patterns", phases: ["ui-design", "dev"], when: "Nuxt 3 auto-imports + composables" }],
  express: [{ skill: "express-patterns", phases: ["design", "dev"], when: "Express middleware + 路由 + 错误处理模式" }],
  fastapi: [{ skill: "fastapi-patterns", phases: ["design", "dev"], when: "FastAPI Pydantic + DI + 中间件模式" }],
  django: [{ skill: "django-patterns", phases: ["design", "dev"], when: "Django MVT + ORM + middleware 模式" }],
  flask: [{ skill: "flask-patterns", phases: ["design", "dev"], when: "Flask Blueprint + 扩展模式" }],
  gin: [{ skill: "gin-patterns", phases: ["design", "dev"], when: "Gin middleware + binding + 路由群组" }],
  spring: [{ skill: "spring-patterns", phases: ["design", "dev"], when: "Spring Boot DI + JPA + 切面模式" }],
  rails: [{ skill: "rails-patterns", phases: ["design", "dev"], when: "Rails MVC + ActiveRecord + 约定模式" }],
  laravel: [{ skill: "laravel-patterns", phases: ["design", "dev"], when: "Laravel Eloquent + Service Container" }],
  remix: [{ skill: "remix-patterns", phases: ["ui-design", "dev"], when: "Remix loader/action + 渐进增强" }],
  astro: [{ skill: "astro-patterns", phases: ["ui-design", "dev"], when: "Astro islands + 零 JS 模式" }],
};

// ── infra ECC hooks ──

const INFRA_HOOKS: Record<DetectedInfra, Def[]> = {
  docker: [{ skill: "docker-patterns", phases: ["dev", "test"], when: "Docker 多阶段构建 + 安全最佳实践" }],
  kubernetes: [{ skill: "kubernetes-patterns", phases: ["dev", "integration"], when: "K8s manifests + Helm + 资源限制" }],
  "github-actions": [
    { skill: "github-actions-patterns", phases: ["dev", "integration"], when: "GitHub Actions workflow + 缓存 + 安全" },
  ],
  "gitlab-ci": [
    { skill: "gitlab-ci-patterns", phases: ["dev", "integration"], when: "GitLab CI pipeline + 缓存 + 安全" },
  ],
};

// ── database ECC hooks ──

const DB_HOOKS: Record<DetectedDb, Def[]> = {
  prisma: [{ skill: "prisma-patterns", phases: ["design", "dev"], when: "Prisma schema + migrations + 关系建模" }],
  typeorm: [{ skill: "typeorm-patterns", phases: ["design", "dev"], when: "TypeORM entity + repository + migration" }],
  drizzle: [{ skill: "drizzle-patterns", phases: ["design", "dev"], when: "Drizzle ORM schema + query + migration" }],
  alembic: [{ skill: "alembic-patterns", phases: ["design", "dev"], when: "Alembic 迁移 + 版本管理" }],
  "django-orm": [{ skill: "django-orm-patterns", phases: ["design", "dev"], when: "Django ORM QuerySet + migration" }],
  sqlalchemy: [{ skill: "sqlalchemy-patterns", phases: ["design", "dev"], when: "SQLAlchemy 2.0 + async session + ORM patterns" }],
  gorm: [{ skill: "gorm-patterns", phases: ["design", "dev"], when: "GORM model + migration + hook" }],
};

// ── test ECC hooks ──

const TEST_HOOKS: Record<DetectedTest, Def[]> = {
  vitest: [{ skill: "vitest-patterns", phases: ["task", "dev", "test"], when: "Vitest 测试模式 + coverage" }],
  jest: [{ skill: "jest-patterns", phases: ["task", "dev", "test"], when: "Jest 测试模式 + mock" }],
  playwright: [{ skill: "playwright-patterns", phases: ["test"], when: "Playwright E2E + 页面对象模式" }],
  cypress: [{ skill: "cypress-patterns", phases: ["test"], when: "Cypress E2E + 自定义命令模式" }],
  pytest: [{ skill: "pytest-patterns", phases: ["task", "dev", "test"], when: "pytest fixtures + parametrize + mock" }],
  junit: [{ skill: "junit-patterns", phases: ["task", "dev", "test"], when: "JUnit 5 parameterized + mockito" }],
};

// ── language ECC hooks ──

const LANG_HOOKS: Record<DetectedLanguage, Def[]> = {
  go: [
    { skill: "golang-patterns", phases: ["dev"], when: "patterns + race detector" },
    { skill: "golang-testing", phases: ["dev"], when: "测试规范 + coverage" },
  ],
  typescript: [
    { skill: "typescript-patterns", phases: ["dev"], when: "strict 类型 + Zod + 现代 TS 模式" },
    { skill: "typescript-ecosystem", phases: ["task", "dev"], when: "Bun/Biome/tsc 工具链对齐" },
  ],
  javascript: [{ skill: "javascript-patterns", phases: ["dev"], when: "ES2024 + ESLint + JSDoc 类型标注" }],
  python: [
    { skill: "python-patterns", phases: ["dev"], when: "Pydantic v2 + 类型注解 + 现代 Python" },
    { skill: "python-ecosystem", phases: ["task", "dev"], when: "uv + ruff + basedpyright 工具链对齐" },
  ],
  rust: [{ skill: "rust-patterns", phases: ["dev"], when: "cargo clippy + miri + unsafe 审计" }],
  java: [
    { skill: "java-patterns", phases: ["dev"], when: "JUnit 5 + Mockito + 现代 Java" },
    { skill: "java-ecosystem", phases: ["task", "dev"], when: "Maven/Gradle + SpotBugs + Checkstyle" },
  ],
  kotlin: [{ skill: "kotlin-patterns", phases: ["dev"], when: "Kotlin Test + MockK + coroutines" }],
  scala: [{ skill: "scala-patterns", phases: ["dev"], when: "ScalaTest + ZIO/Cats Effect" }],
  csharp: [{ skill: "csharp-patterns", phases: ["dev"], when: "xUnit + Moq + modern .NET" }],
  ruby: [{ skill: "ruby-patterns", phases: ["dev"], when: "RSpec + RuboCop + Sorbet" }],
  php: [{ skill: "php-patterns", phases: ["dev"], when: "PHPStan/Psalm + PHPUnit + PSR" }],
  swift: [{ skill: "swift-patterns", phases: ["dev"], when: "XCTest + SwiftLint + concurrency safety" }],
  dart: [{ skill: "dart-patterns", phases: ["dev"], when: "Dart test + lints + null safety" }],
  elixir: [{ skill: "elixir-patterns", phases: ["dev"], when: "ExUnit + Credo + Dialyzer" }],
  haskell: [{ skill: "haskell-patterns", phases: ["dev"], when: "HUnit + hlint + GHC 警告" }],
  zig: [{ skill: "zig-patterns", phases: ["dev"], when: "Zig test + safety 模式" }],
  lua: [{ skill: "lua-patterns", phases: ["dev"], when: "busted + luacheck" }],
  cpp: [{ skill: "cpp-patterns", phases: ["dev"], when: "CMake + clang-tidy + sanitizers" }],
  terraform: [{ skill: "terraform-patterns", phases: ["dev"], when: "terraform fmt + validate + tflint" }],
  shell: [{ skill: "shell-patterns", phases: ["dev"], when: "shellcheck + shfmt" }],
};

// ── unified hook generation ──

export function getAllProjectHooks(workspaceDir: string, phase: string): HarnessHook[] {
  const tech = detectProjectTechStack(workspaceDir);
  const hooks: HarnessHook[] = [];

  function add(defs: Def[], tag: string) {
    for (const d of defs) {
      if (!d.phases.includes(phase)) continue;
      hooks.push({ tool: "ecc", skill: d.skill, when: `[${tag}] ${d.when}`, optional: false });
    }
  }

  for (const lang of tech.languages) add(LANG_HOOKS[lang] ?? [], lang);
  for (const fw of tech.frameworks) add(FRAMEWORK_HOOKS[fw] ?? [], fw);
  for (const inf of tech.infra) add(INFRA_HOOKS[inf] ?? [], inf);
  for (const db of tech.databases) add(DB_HOOKS[db] ?? [], db);
  for (const t of tech.tests) add(TEST_HOOKS[t] ?? [], t);

  return hooks;
}

// ── language filter (for removing non-matching manifest hooks) ──

const LANG_PREFIXES: Record<string, boolean> = {};
for (const lang of Object.keys(LANG_HOOKS)) {
  LANG_PREFIXES[lang === "go" ? "golang" : lang] = true;
}
for (const fw of Object.keys(FRAMEWORK_HOOKS)) LANG_PREFIXES[fw] = true;
for (const inf of Object.keys(INFRA_HOOKS)) LANG_PREFIXES[inf] = true;
for (const db of Object.keys(DB_HOOKS)) LANG_PREFIXES[db] = true;
for (const t of Object.keys(TEST_HOOKS)) LANG_PREFIXES[t] = true;

export function isNonMatchingProjectSkill(skill: string, tags: string[]): boolean {
  if (tags.length === 0) return false;
  const match = tags.some((t) => {
    const pfx = t === "go" ? "golang" : t;
    return skill.startsWith(`${pfx}-`);
  });
  if (match) return false;
  return Object.keys(LANG_PREFIXES).some((p) => skill.startsWith(`${p}-`));
}
