import path from "node:path";
import type { WorkflowEngine } from "./workflow-engine.js";
import type { ChangeProfile } from "./types.js";
import { resolveActiveSlug, slugifyTitle } from "./active-slug.js";
import {
  loadProjectConfig,
  profileForScenario,
  resolveScenarioFromConfig,
  type ProjectScenarioId,
} from "./project-config.js";

export type ScenarioId =
  | "feature"
  | "bug"
  | "mvp"
  | "micro"
  | "nano"
  | "service"
  | "design-system"
  | "ci"
  | "refactor"
  | "hotfix"
  | "prototype"
  | "config"
  | "docs"
  | "dep-upgrade";

export type ScenarioRunResult = {
  ok: boolean;
  scenario: ScenarioId;
  slug?: string;
  profile?: ChangeProfile;
  text: string;
};

// ── Data-driven playbook definitions ──

interface PlaybookDef {
  title: string;
  subtitle: string;
  profile: ChangeProfile;
  defaultSlug: string;
  slugAware: boolean;
  featureMode?: boolean;
  conditionalCreate?: boolean;
  createLabel: string;
  body: string[];
}

const SCENARIO_PLAYBOOKS: Record<ScenarioId, PlaybookDef> = {
  feature: {
    title: "Taiyi 场景 · 做功能",
    subtitle: "profile **full**（九阶段）· 用户给标题则先 new，否则用当前 slug",
    profile: "full",
    defaultSlug: "",
    slugAware: true,
    featureMode: true,
    createLabel: "1. 创建变更:",
    body: [
      "推荐串联:",
      "  /taiyi:status → /taiyi:explore → /taiyi:write（每阶段）",
      "  阶段顺序: change → requirement → design → ui-design → task",
      "  → /taiyi:tdd plan → /taiyi:tdd dev · /taiyi:mode ralph",
      "  → /taiyi:test smoke · /taiyi:test e2e · /taiyi:test qa",
      "  → /taiyi:review loop · /taiyi:test security",
      "  → /taiyi:commit → /taiyi:verify → /taiyi:ship → /taiyi:land",
      "  → /taiyi:integration → /taiyi:archive",
      "",
      "总览: /taiyi:flow · 全自动: /taiyi:mode autopilot（须 --auto）",
    ],
  },
  bug: {
    title: "Taiyi 场景 · 修 Bug",
    subtitle: "profile **lite** — 跳过 design / ui-design / task / review",
    profile: "lite",
    defaultSlug: "fix-export-bug",
    slugAware: true,
    createLabel: "1. 创建 lite 变更:",
    body: [
      "lite 路径（每阶段 /taiyi:write + /taiyi:continue）:",
      "  change → requirement → dev → test → integration",
      "",
      "  /taiyi:write · /taiyi:tdd dev · /taiyi:mode ralph",
      "  /taiyi:test smoke · /taiyi:test e2e（若有 UI 回归）",
      "  /taiyi:integration · /taiyi:commit · /taiyi:archive",
      "",
      "无 REVIEW.md / review-loop；仍须 TEST.md 证据 + integration 交付门",
    ],
  },
  mvp: {
    title: "Taiyi 场景 · 创业 MVP",
    subtitle: "profile **spike** — 跳过 requirement / design / ui-design / task / review",
    profile: "spike",
    defaultSlug: "mvp-onboarding",
    slugAware: true,
    createLabel: "1. 创建 spike 变更:",
    body: [
      "spike 路径（四阶段）:",
      "  change → dev → test → integration",
      "",
      "  CHANGE.md 写清动机 + 成功标准（代替 REQUIREMENT）",
      "  /taiyi:tdd dev · /taiyi:mode ralph · /taiyi:test smoke",
      "  可设 TAIYI_DELIVERY_GATE=0 本地演示；上线前仍建议 commit + verify",
      "  设 TAIYI_SKIP_QUALITY_GATE=1 绕过 quality gate 快速通过",
      "  /taiyi:archive",
    ],
  },
  micro: {
    title: "Taiyi 场景 · 个人工具",
    subtitle: "profile **micro** — 跳过 requirement / design / task / test / review",
    profile: "micro",
    defaultSlug: "cli-helper",
    slugAware: true,
    createLabel: "1. 创建 micro 变更:",
    body: [
      "micro 路径（三阶段）:",
      "  change → dev → integration",
      "",
      "  无 TEST.md 门禁；integration 仍写 CHANGELOG.md",
      "  /taiyi:write change → /taiyi:tdd dev → /taiyi:archive",
      "  设 TAIYI_SKIP_QUALITY_GATE=1 可绕过 quality gate 快速过关",
      "  真正零文档选 /taiyi:nano（连 CHANGE.md 都跳过）",
    ],
  },
  nano: {
    title: "Taiyi 场景 · 极简变更",
    subtitle: "profile **nano** — 跳过所有文档阶段，dev→integration 直出",
    profile: "nano",
    defaultSlug: "hotfix-login",
    slugAware: true,
    createLabel: "1. 创建 nano 变更:",
    body: [
      "nano 路径（二阶段，无任何文档工件）:",
      "  dev → integration",
      "",
      "  直接从 dev 开始: 写代码 → 创建 .dev-complete",
      "  integration 阶段写 CHANGELOG.md → /taiyi:archive",
      "  TAIYI_SKIP_QUALITY_GATE=1 可跳过 quality 门禁",
      "  适于: 个人脚本、热修复、实验性改动",
    ],
  },
  service: {
    title: "Taiyi 场景 · 后端服务",
    subtitle: "profile **api** — 九阶段 minus ui-design；适合 API / 服务长期演进",
    profile: "api",
    defaultSlug: "",
    slugAware: true,
    conditionalCreate: true,
    createLabel: "1. 创建 api 变更:",
    body: [
      "推荐:",
      "  requirement + design + task + dev + test + review + integration",
      "  /taiyi:diagram-c4 · /taiyi:health（medium/high 复杂度）",
      "  /taiyi:review-loop · /taiyi:test security",
      "  deliveryVerifyCmd 对齐现有 CI（package.json 或 .taiyi/config.json）",
      "",
      "配置示例 .taiyi/config.json:",
      '  { "scenario": "service", "defaultProfile": "api", "deliveryVerifyCmd": "npm test" }',
    ],
  },
  "design-system": {
    title: "Taiyi 场景 · 设计系统",
    subtitle: "profile **ui**（完整九阶段，UI 优先 harness）",
    profile: "ui",
    defaultSlug: "",
    slugAware: true,
    conditionalCreate: true,
    createLabel: "1. 创建 ui 变更:",
    body: [
      "重点阶段:",
      "  ui-design → /taiyi:restyle",
      "  test → /taiyi:ui-test · playwright · accessibility",
      "  review → visual QA",
      "",
      'config: { "scenario": "design-system", "defaultProfile": "ui" }',
    ],
  },
  ci: {
    title: "Taiyi 场景 · 成熟 DevOps",
    subtitle: "已有 CI/CD 时 — 用 Taiyi 作变更追溯 + verify，不重复跑交付门",
    profile: "full",
    defaultSlug: "",
    slugAware: false,
    createLabel: "",
    body: [
      "1. 配置 .taiyi/config.json:",
      "   {",
      '     "scenario": "devops",',
      '     "deliveryGate": false,',
      '     "commitTrailers": false,',
      '     "deliveryVerifyCmd": "npm run ci:verify"',
      "   }",
      "",
      "2. 日常命令:",
      "   npm run taiyi -- ci verify",
      "   npm run taiyi -- ci platform",
      "   有活跃变更时: /taiyi:verify · /taiyi:audit",
      "",
      "3. 仍需追溯时开 lite/spike 变更，integration 仅写 CHANGELOG",
    ],
  },
  refactor: {
    title: "Taiyi 场景 · 代码重构",
    subtitle: "profile **lite** — 不改行为，只改结构；跳过 design / ui-design / task / review",
    profile: "lite",
    defaultSlug: "refactor-auth",
    slugAware: true,
    createLabel: "1. 创建 lite 变更:",
    body: [
      "lite 路径（每阶段 /taiyi:write + /taiyi:continue）:",
      "  change → requirement → dev → test → integration",
      "",
      "  重构原则: 不做行为改动，只改进内部结构",
      "  /taiyi:write · /taiyi:tdd dev（测试覆盖先行）· /taiyi:mode ralph",
      "  /taiyi:test smoke · /taiyi:test e2e（回归）",
      "  /taiyi:integration · /taiyi:commit · /taiyi:archive",
      "",
      "无 REVIEW.md / review-loop；仍须 TEST.md 证据 + integration 交付门",
    ],
  },
  hotfix: {
    title: "Taiyi 场景 · 紧急热修复",
    subtitle: "profile **nano** — 零文档直出，dev→integration 直通生产",
    profile: "nano",
    defaultSlug: "hotfix-payment",
    slugAware: true,
    createLabel: "1. 创建 nano 变更:",
    body: [
      "nano 路径（二阶段，无任何文档工件）:",
      "  dev → integration",
      "",
      "  直接从 dev 开始: 写修复代码 → 创建 .dev-complete",
      "  integration 阶段写 CHANGELOG.md → /taiyi:archive",
      "  TAIYI_SKIP_QUALITY_GATE=1 可跳过 quality 门禁加速上线",
      "  适于: 生产热修复、紧急阻断、安全补丁",
    ],
  },
  prototype: {
    title: "Taiyi 场景 · 快速原型",
    subtitle: "profile **spike** — 跳过 requirement / design / ui-design / task / review；试错优先",
    profile: "spike",
    defaultSlug: "proto-new-idea",
    slugAware: true,
    createLabel: "1. 创建 spike 变更:",
    body: [
      "spike 路径（四阶段）:",
      "  change → dev → test → integration",
      "",
      "  CHANGE.md 写清探索目标 + 成功标准（代替 REQUIREMENT）",
      "  /taiyi:tdd dev · /taiyi:mode ralph · /taiyi:test smoke",
      "  可设 TAIYI_DELIVERY_GATE=0 本地演示；上线前仍建议 commit + verify",
      "  设 TAIYI_SKIP_QUALITY_GATE=1 绕过 quality gate 快速通过",
      "  适于: 新想法验证、技术调研、POC 原型",
      "  /taiyi:archive",
    ],
  },
  config: {
    title: "Taiyi 场景 · 配置变更",
    subtitle: "profile **micro** — 跳过 requirement / design / task / test / review；只改配置，不动逻辑",
    profile: "micro",
    defaultSlug: "update-env",
    slugAware: true,
    createLabel: "1. 创建 micro 变更:",
    body: [
      "micro 路径（三阶段）:",
      "  change → dev → integration",
      "",
      "  无 TEST.md 门禁；integration 仍写 CHANGELOG.md",
      "  /taiyi:write change → /taiyi:tdd dev → /taiyi:archive",
      "  设 TAIYI_SKIP_QUALITY_GATE=1 可绕过 quality gate 快速过关",
      "  适于: 环境变量、CI/CD 配置、部署参数、feature toggle",
    ],
  },
  docs: {
    title: "Taiyi 场景 · 文档更新",
    subtitle: "profile **nano** — 只改文档不改代码；dev→integration 直出",
    profile: "nano",
    defaultSlug: "update-readme",
    slugAware: true,
    createLabel: "1. 创建 nano 变更:",
    body: [
      "nano 路径（二阶段，无任何文档工件）:",
      "  dev → integration",
      "",
      "  直接从 dev 开始: 写文档 → 创建 .dev-complete",
      "  integration 阶段写 CHANGELOG.md → /taiyi:archive",
      "  TAIYI_SKIP_QUALITY_GATE=1 可跳过 quality 门禁",
      "  适于: README、API 文档、注释更新、CHANGELOG 补写",
    ],
  },
  "dep-upgrade": {
    title: "Taiyi 场景 · 依赖升级",
    subtitle: "profile **micro** — 只升级依赖不改业务逻辑；跳过 requirement / design / task / test / review",
    profile: "micro",
    defaultSlug: "bump-deps",
    slugAware: true,
    createLabel: "1. 创建 micro 变更:",
    body: [
      "micro 路径（三阶段）:",
      "  change → dev → integration",
      "",
      "  无 TEST.md 门禁；integration 仍写 CHANGELOG.md",
      "  /taiyi:write change → /taiyi:tdd dev → /taiyi:archive",
      "  建议先用 npx taze / npm outdated 扫描可升级项",
      "  设 TAIYI_SKIP_QUALITY_GATE=1 跳过 quality gate 加速批量升级",
      "  适于: 安全补丁、semver-minor/patch 升级、锁定版本",
    ],
  },
};

function scenarioHeader(title: string, subtitle: string): string[] {
  return [`══ ${title} ══`, subtitle, ""];
}

function resolveScenarioSlug(
  engine: WorkflowEngine,
  titleOrSlug?: string,
): { slug?: string; hasState: boolean; title?: string } {
  const title = titleOrSlug?.trim();
  if (!title) return { hasState: false };
  const looksLikeSlug = /^[a-z0-9][a-z0-9-]*$/i.test(title);
  const slug = looksLikeSlug ? title : slugifyTitle(title);
  return { slug, hasState: Boolean(engine.getState(slug)), title };
}

function shortScenarioLine(
  scenario: string,
  slug: string,
  profile: ChangeProfile,
): string {
  return `slug=${slug} scenario=${scenario} profile=${profile} → /taiyi:status ${slug}`;
}

function appendCreateHint(
  lines: string[],
  explicitSlug: string | undefined,
  looksLikeSlug: boolean | "" | undefined,
  profile: ChangeProfile,
): void {
  if (!explicitSlug) return;
  if (looksLikeSlug) {
    lines.push(`   scripts/taiyi-forge.sh init ${explicitSlug} --profile ${profile} --title "…"`);
  } else {
    lines.push(`   scripts/taiyi-forge.sh new "${explicitSlug}" --profile ${profile}`);
  }
  lines.push("   （或 /taiyi:new … --profile …）");
  lines.push("");
}

function resolveWorkspaceFromTaiyiRoot(taiyiRoot: string): string {
  return path.dirname(taiyiRoot);
}

// ── Unified render function (single source of truth) ──

export function renderScenarioPlaybook(
  engine: WorkflowEngine,
  taiyiRoot: string,
  scenario: ScenarioId,
  titleOrSlug?: string,
): ScenarioRunResult {
  const pb = SCENARIO_PLAYBOOKS[scenario];
  if (!pb) throw new Error(`Unknown scenario: ${scenario}`);

  // ci: slugless scenario, config-aware
  if (!pb.slugAware) {
    const workspaceDir = resolveWorkspaceFromTaiyiRoot(taiyiRoot);
    const cfg = loadProjectConfig(workspaceDir);
    const lines = scenarioHeader(pb.title, pb.subtitle);
    for (const l of pb.body) lines.push(l);
    if (cfg.deliveryGate === false) {
      lines.push("");
      lines.push("✓ 当前项目 deliveryGate 已关闭");
    }
    return { ok: true, scenario, profile: pb.profile, text: lines.join("\n") };
  }

  // Existing slug → short status line
  const existing = resolveScenarioSlug(engine, titleOrSlug);
  if (existing.hasState && existing.slug) {
    return {
      ok: true,
      scenario,
      slug: existing.slug,
      profile: pb.profile,
      text: shortScenarioLine(scenario, existing.slug, pb.profile),
    };
  }

  const lines = scenarioHeader(pb.title, pb.subtitle);
  const explicitSlug = titleOrSlug?.trim();
  const looksLikeSlug = explicitSlug && /^[a-z0-9][a-z0-9-]*$/i.test(explicitSlug);

  // micro: config advice before create hint
  if (scenario === "micro") {
    const workspaceDir = resolveWorkspaceFromTaiyiRoot(taiyiRoot);
    const cfg = loadProjectConfig(workspaceDir);
    if (cfg.deliveryGate === false) {
      lines.push("✓ 项目已关闭 deliveryGate（.taiyi/config.json）");
      lines.push("");
    } else {
      lines.push("建议 .taiyi/config.json:");
      lines.push('  { "defaultProfile": "micro", "deliveryGate": false, "commitTrailers": false }');
      lines.push("");
    }
  }

  // feature mode: check active slug when no input
  if (pb.featureMode && !explicitSlug) {
    const resolved = resolveActiveSlug(taiyiRoot);
    if (!resolved.ok) {
      lines.push("无活跃变更 → 先:");
      lines.push('  /taiyi:new <功能标题>   例: /taiyi:new 用户登录');
      return { ok: false, scenario, profile: pb.profile, text: lines.join("\n") };
    }
    lines.push(`当前 slug: **${resolved.slug}**`);
    lines.push("");
  }

  // feature mode: create hint when explicit slug provided and no state
  if (pb.featureMode && explicitSlug && !engine.getState(explicitSlug)) {
    lines.push(pb.createLabel);
    appendCreateHint(lines, explicitSlug, looksLikeSlug, pb.profile);
  }

  // standard mode (bug/mvp/micro/nano): create hint
  if (!pb.featureMode && !pb.conditionalCreate) {
    const slug = explicitSlug || pb.defaultSlug;
    if (!explicitSlug || !engine.getState(slug)) {
      lines.push(pb.createLabel);
      appendCreateHint(lines, slug, looksLikeSlug, pb.profile);
      if (scenario === "mvp") {
        lines.push('   或在 .taiyi/config.json 设 `"scenario": "mvp"` 作为默认');
        lines.push("");
      }
    }
  }

  // conditional mode (service/design-system): create hint only when explicit slug given
  if (pb.conditionalCreate && explicitSlug && !engine.getState(explicitSlug)) {
    lines.push(pb.createLabel);
    appendCreateHint(lines, explicitSlug, looksLikeSlug, pb.profile);
  }

  for (const l of pb.body) lines.push(l);

  return {
    ok: true,
    scenario,
    slug: explicitSlug && engine.getState(explicitSlug) ? explicitSlug : undefined,
    profile: pb.profile,
    text: lines.join("\n"),
  };
}

export function runFlowScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  topic?: string,
): ScenarioRunResult {
  const normalized = topic?.trim().toLowerCase();
  const aliases: Record<string, ScenarioId> = {
    feature: "feature",
    bug: "bug",
    mvp: "mvp",
    spike: "mvp",
    micro: "micro",
    nano: "nano",
    quick: "nano",
    service: "service",
    api: "service",
    "design-system": "design-system",
    design: "design-system",
    ui: "design-system",
    ci: "ci",
    devops: "ci",
    refactor: "refactor",
    hotfix: "hotfix",
    prototype: "prototype",
    proto: "prototype",
    config: "config",
    docs: "docs",
    documentation: "docs",
    "dep-upgrade": "dep-upgrade",
    upgrade: "dep-upgrade",
    deps: "dep-upgrade",
  };
  if (normalized && aliases[normalized]) {
    return runScenario(engine, taiyiRoot, aliases[normalized]!);
  }

  const workspaceDir = resolveWorkspaceFromTaiyiRoot(taiyiRoot);
  const cfg = loadProjectConfig(workspaceDir);
  const lines = scenarioHeader(
    "Taiyi 场景 · 选型",
    cfg.scenario && cfg.scenario !== "default"
      ? `项目 config 推荐: **${cfg.scenario}**（.taiyi/config.json）`
      : "按项目类型选 playbook；可用 `flow <场景>` 展开详情",
  );
  lines.push("| 场景 | 命令 | profile | 适用 |");
  lines.push("|------|------|---------|------|");
  lines.push("| 后端 / 服务长期维护 | `/taiyi:service` | api | 九阶段 minus UI 设计 |");
  lines.push("| 设计系统 / 组件库 | `/taiyi:design-system` | ui | UI-DESIGN + restyle + review |");
  lines.push("| 创业 MVP | `/taiyi:mvp` | spike | change→dev→test→integration |");
  lines.push("| 快速原型 | `/taiyi:prototype` | spike | change→dev→test→integration，试错优先 |");
  lines.push("| 代码重构 | `/taiyi:refactor` | lite | 不改行为，只改结构 |");
  lines.push("| 个人工具 | `/taiyi:micro` | micro | change→dev→integration |");
  lines.push("| 配置变更 | `/taiyi:config` | micro | change→dev→integration，只改配置 |");
  lines.push("| 依赖升级 | `/taiyi:dep-upgrade` | micro | change→dev→integration，只升依赖 |");
  lines.push("| 极简变更（零文档） | `/taiyi:nano` | nano | dev→integration 直出，无任何文档 |");
  lines.push("| 紧急热修复 | `/taiyi:hotfix` | nano | dev→integration 直出，生产阻断 |");
  lines.push("| 文档更新 | `/taiyi:docs` | nano | dev→integration 直出，只改文档 |");
  lines.push("| 修 Bug | `/taiyi:bug` | lite | 五阶段 lite |");
  lines.push("| 大功能 | `/taiyi:feature` | full | 完整九阶段 |");
  lines.push("| 成熟 DevOps | `/taiyi:flow devops` | — | 仅 CI verify + 配置交付门 |");
  lines.push("");
  lines.push("示例: scripts/taiyi-forge.sh flow mvp");
  lines.push("配置: .taiyi/config.json → defaultProfile / deliveryGate / scenario");
  lines.push("文档: docs/taiyi/scenario-playbooks.md");

  return { ok: true, scenario: "feature", text: lines.join("\n") };
}

export function runScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  scenario: ScenarioId,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, scenario, titleOrSlug);
}

export function runFeatureScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "feature", titleOrSlug);
}

export function runBugScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "bug", titleOrSlug);
}

export function runMvpScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "mvp", titleOrSlug);
}

export function runMicroScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "micro", titleOrSlug);
}

export function runNanoScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "nano", titleOrSlug);
}

export function runServiceScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "service", titleOrSlug);
}

export function runDesignSystemScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "design-system", titleOrSlug);
}

export function runCiScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "ci", titleOrSlug);
}

export function runRefactorScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "refactor", titleOrSlug);
}

export function runHotfixScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "hotfix", titleOrSlug);
}

export function runPrototypeScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "prototype", titleOrSlug);
}

export function runConfigScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "config", titleOrSlug);
}

export function runDocsScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "docs", titleOrSlug);
}

export function runDepUpgradeScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  return renderScenarioPlaybook(engine, taiyiRoot, "dep-upgrade", titleOrSlug);
}

export function runConfiguredScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
): ScenarioRunResult {
  const workspaceDir = resolveWorkspaceFromTaiyiRoot(taiyiRoot);
  const scenario = resolveScenarioFromConfig(workspaceDir);
  if (scenario === "default") {
    return runFlowScenario(engine, taiyiRoot);
  }
  const id: ScenarioId =
    scenario === "devops"
      ? "ci"
      : scenario === "design-system"
        ? "design-system"
        : scenario === "nano"
          ? "nano"
          : (scenario as ScenarioId);
  return runScenario(engine, taiyiRoot, id);
}

export { profileForScenario, type ProjectScenarioId };
