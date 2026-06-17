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
import { resolveTaiyiRoot } from "./paths.js";

export type ScenarioId =
  | "feature"
  | "bug"
  | "mvp"
  | "micro"
  | "nano"
  | "service"
  | "design-system"
  | "ci"
  | "audit";

export type ScenarioRunResult = {
  ok: boolean;
  scenario: ScenarioId;
  slug?: string;
  profile?: ChangeProfile;
  text: string;
};

const SCENARIO_PROFILE: Record<ScenarioId, ChangeProfile> = {
  feature: "full",
  bug: "lite",
  mvp: "spike",
  micro: "micro",
  nano: "nano",
  service: "api",
  "design-system": "ui",
  ci: "full",
  audit: "audit",
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
  lines.push("| 个人工具 | `/taiyi:micro` | micro | change→dev→integration |");
  lines.push("| 极简变更（零文档） | `/taiyi:nano` | nano | dev→integration 直出，无任何文档 |");
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
  switch (scenario) {
    case "feature":
      return runFeatureScenario(engine, taiyiRoot, titleOrSlug);
    case "bug":
      return runBugScenario(engine, taiyiRoot, titleOrSlug);
    case "mvp":
      return runMvpScenario(engine, taiyiRoot, titleOrSlug);
    case "micro":
      return runMicroScenario(engine, taiyiRoot, titleOrSlug);
    case "nano":
      return runNanoScenario(engine, taiyiRoot, titleOrSlug);
    case "service":
      return runServiceScenario(engine, taiyiRoot, titleOrSlug);
    case "design-system":
      return runDesignSystemScenario(engine, taiyiRoot, titleOrSlug);
    case "ci":
      return runCiScenario(engine, taiyiRoot, titleOrSlug);
    default:
      return runFeatureScenario(engine, taiyiRoot, titleOrSlug);
  }
}

export function runFeatureScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  const profile = SCENARIO_PROFILE.feature;
  const existing = resolveScenarioSlug(engine, titleOrSlug);
  if (existing.hasState && existing.slug) {
    return {
      ok: true,
      scenario: "feature",
      slug: existing.slug,
      profile,
      text: shortScenarioLine("feature", existing.slug, profile),
    };
  }

  const lines = scenarioHeader(
    "Taiyi 场景 · 做功能",
    "profile **full**（九阶段）· 用户给标题则先 new，否则用当前 slug",
  );

  const explicitSlug = titleOrSlug?.trim();
  const looksLikeSlug = explicitSlug && /^[a-z0-9][a-z0-9-]*$/i.test(explicitSlug);
  const hasState = looksLikeSlug && engine.getState(explicitSlug);

  if (!hasState && explicitSlug) {
    lines.push("1. 创建变更:");
    appendCreateHint(lines, explicitSlug, looksLikeSlug, profile);
  } else if (!explicitSlug) {
    const resolved = resolveActiveSlug(taiyiRoot);
    if (!resolved.ok) {
      lines.push("无活跃变更 → 先:");
      lines.push('  /taiyi:new <功能标题>   例: /taiyi:new 用户登录');
      return { ok: false, scenario: "feature", profile, text: lines.join("\n") };
    }
    lines.push(`当前 slug: **${resolved.slug}**`);
    lines.push("");
  } else {
    lines.push(`slug: **${explicitSlug}**`);
    lines.push("");
  }

  lines.push("推荐串联:");
  lines.push("  /taiyi:status → /taiyi:explore → /taiyi:write（每阶段）");
  lines.push("  阶段顺序: change → requirement → design → ui-design → task");
  lines.push("  → /taiyi:tdd plan → /taiyi:tdd dev · /taiyi:mode ralph");
  lines.push("  → /taiyi:test smoke · /taiyi:test e2e · /taiyi:test qa");
  lines.push("  → /taiyi:review loop · /taiyi:test security");
  lines.push("  → /taiyi:commit → /taiyi:verify → /taiyi:ship → /taiyi:land");
  lines.push("  → /taiyi:integration → /taiyi:archive");
  lines.push("");
  lines.push("总览: /taiyi:flow · 全自动: /taiyi:mode autopilot（须 --auto）");

  return {
    ok: true,
    scenario: "feature",
    slug: hasState ? explicitSlug : undefined,
    profile,
    text: lines.join("\n"),
  };
}

export function runBugScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  const profile = SCENARIO_PROFILE.bug;
  const existing = resolveScenarioSlug(engine, titleOrSlug);
  if (existing.hasState && existing.slug) {
    return {
      ok: true,
      scenario: "bug",
      slug: existing.slug,
      profile,
      text: shortScenarioLine("bug", existing.slug, profile),
    };
  }

  const lines = scenarioHeader(
    "Taiyi 场景 · 修 Bug",
    "profile **lite** — 跳过 design / ui-design / task / review",
  );

  const explicitSlug = titleOrSlug?.trim();
  const looksLikeSlug = explicitSlug && /^[a-z0-9][a-z0-9-]*$/i.test(explicitSlug);
  const hasState = looksLikeSlug && engine.getState(explicitSlug);

  if (!hasState) {
    lines.push("1. 创建 lite 变更:");
    appendCreateHint(lines, explicitSlug ?? "fix-export-bug", looksLikeSlug, profile);
  } else {
    lines.push(`slug: **${explicitSlug}**（确认 profile=lite）`);
    lines.push("");
  }

  lines.push("lite 路径（每阶段 /taiyi:write + /taiyi:continue）:");
  lines.push("  change → requirement → dev → test → integration");
  lines.push("");
  lines.push("  /taiyi:write · /taiyi:tdd dev · /taiyi:mode ralph");
  lines.push("  /taiyi:test smoke · /taiyi:test e2e（若有 UI 回归）");
  lines.push("  /taiyi:integration · /taiyi:commit · /taiyi:archive");
  lines.push("");
  lines.push("无 REVIEW.md / review-loop；仍须 TEST.md 证据 + integration 交付门");

  return {
    ok: true,
    scenario: "bug",
    slug: hasState ? explicitSlug : undefined,
    profile,
    text: lines.join("\n"),
  };
}

export function runMvpScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  const profile = SCENARIO_PROFILE.mvp;
  const existing = resolveScenarioSlug(engine, titleOrSlug);
  if (existing.hasState && existing.slug) {
    return {
      ok: true,
      scenario: "mvp",
      slug: existing.slug,
      profile,
      text: shortScenarioLine("mvp", existing.slug, profile),
    };
  }

  const lines = scenarioHeader(
    "Taiyi 场景 · 创业 MVP",
    "profile **spike** — 跳过 requirement / design / ui-design / task / review",
  );

  const explicitSlug = titleOrSlug?.trim();
  const looksLikeSlug = explicitSlug && /^[a-z0-9][a-z0-9-]*$/i.test(explicitSlug);
  const hasState = looksLikeSlug && engine.getState(explicitSlug);

  if (!hasState) {
    lines.push("1. 创建 spike 变更:");
    appendCreateHint(lines, explicitSlug ?? "mvp-onboarding", looksLikeSlug, profile);
    lines.push('   或在 .taiyi/config.json 设 `"scenario": "mvp"` 作为默认');
    lines.push("");
  }

  lines.push("spike 路径（四阶段）:");
  lines.push("  change → dev → test → integration");
  lines.push("");
  lines.push("  CHANGE.md 写清动机 + 成功标准（代替 REQUIREMENT）");
  lines.push("  /taiyi:tdd dev · /taiyi:mode ralph · /taiyi:test smoke");
  lines.push("  可设 TAIYI_DELIVERY_GATE=0 本地演示；上线前仍建议 commit + verify");
  lines.push("  设 TAIYI_SKIP_QUALITY_GATE=1 绕过 quality gate 快速通过");
  lines.push("  /taiyi:archive");

  return {
    ok: true,
    scenario: "mvp",
    slug: hasState ? explicitSlug : undefined,
    profile,
    text: lines.join("\n"),
  };
}

export function runMicroScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  const profile = SCENARIO_PROFILE.micro;
  const existing = resolveScenarioSlug(engine, titleOrSlug);
  if (existing.hasState && existing.slug) {
    return {
      ok: true,
      scenario: "micro",
      slug: existing.slug,
      profile,
      text: shortScenarioLine("micro", existing.slug, profile),
    };
  }

  const workspaceDir = resolveWorkspaceFromTaiyiRoot(taiyiRoot);
  const cfg = loadProjectConfig(workspaceDir);

  const lines = scenarioHeader(
    "Taiyi 场景 · 个人工具",
    "profile **micro** — 跳过 requirement / design / task / test / review",
  );

  if (cfg.deliveryGate === false) {
    lines.push("✓ 项目已关闭 deliveryGate（.taiyi/config.json）");
    lines.push("");
  } else {
    lines.push("建议 .taiyi/config.json:");
    lines.push('  { "defaultProfile": "micro", "deliveryGate": false, "commitTrailers": false }');
    lines.push("");
  }

  const explicitSlug = titleOrSlug?.trim();
  const looksLikeSlug = explicitSlug && /^[a-z0-9][a-z0-9-]*$/i.test(explicitSlug);
  const hasState = looksLikeSlug && engine.getState(explicitSlug);

  if (!hasState) {
    lines.push("1. 创建 micro 变更:");
    appendCreateHint(lines, explicitSlug ?? "cli-helper", looksLikeSlug, profile);
    lines.push("");
  }

  lines.push("micro 路径（三阶段）:");
  lines.push("  change → dev → integration");
  lines.push("");
  lines.push("  无 TEST.md 门禁；integration 仍写 CHANGELOG.md");
  lines.push("  /taiyi:write change → /taiyi:tdd dev → /taiyi:archive");
  lines.push("  设 TAIYI_SKIP_QUALITY_GATE=1 可绕过 quality gate 快速过关");
  lines.push("  真正零文档选 /taiyi:nano（连 CHANGE.md 都跳过）");

  return {
    ok: true,
    scenario: "micro",
    slug: hasState ? explicitSlug : undefined,
    profile,
    text: lines.join("\n"),
  };
}

export function runNanoScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  const profile = SCENARIO_PROFILE.nano;
  const existing = resolveScenarioSlug(engine, titleOrSlug);
  if (existing.hasState && existing.slug) {
    return {
      ok: true,
      scenario: "nano",
      slug: existing.slug,
      profile,
      text: shortScenarioLine("nano", existing.slug, profile),
    };
  }

  const lines = scenarioHeader(
    "Taiyi 场景 · 极简变更",
    "profile **nano** — 跳过所有文档阶段，dev→integration 直出",
  );

  const explicitSlug = titleOrSlug?.trim();
  const looksLikeSlug = explicitSlug && /^[a-z0-9][a-z0-9-]*$/i.test(explicitSlug);
  const hasState = looksLikeSlug && engine.getState(explicitSlug);

  if (!hasState) {
    lines.push("1. 创建 nano 变更:");
    appendCreateHint(lines, explicitSlug ?? "hotfix-login", looksLikeSlug, profile);
    lines.push("");
  }

  lines.push("nano 路径（二阶段，无任何文档工件）:");
  lines.push("  dev → integration");
  lines.push("");
  lines.push("  直接从 dev 开始: 写代码 → 创建 .dev-complete");
  lines.push("  integration 阶段写 CHANGELOG.md → /taiyi:archive");
  lines.push("  TAIYI_SKIP_QUALITY_GATE=1 可跳过 quality 门禁");
  lines.push("  适于: 个人脚本、热修复、实验性改动");

  return {
    ok: true,
    scenario: "nano",
    slug: hasState ? explicitSlug : undefined,
    profile,
    text: lines.join("\n"),
  };
}

export function runServiceScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  const profile = SCENARIO_PROFILE.service;
  const existing = resolveScenarioSlug(engine, titleOrSlug);
  if (existing.hasState && existing.slug) {
    return {
      ok: true,
      scenario: "service",
      slug: existing.slug,
      profile,
      text: shortScenarioLine("service", existing.slug, profile),
    };
  }

  const lines = scenarioHeader(
    "Taiyi 场景 · 后端服务",
    "profile **api** — 九阶段 minus ui-design；适合 API / 服务长期演进",
  );

  const explicitSlug = titleOrSlug?.trim();
  const looksLikeSlug = explicitSlug && /^[a-z0-9][a-z0-9-]*$/i.test(explicitSlug);
  if (explicitSlug && !engine.getState(explicitSlug)) {
    lines.push("1. 创建 api 变更:");
    appendCreateHint(lines, explicitSlug, looksLikeSlug, profile);
  }

  lines.push("推荐:");
  lines.push("  requirement + design + task + dev + test + review + integration");
  lines.push("  /taiyi:diagram-c4 · /taiyi:health（medium/high 复杂度）");
  lines.push("  /taiyi:review-loop · /taiyi:test security");
  lines.push("  deliveryVerifyCmd 对齐现有 CI（package.json 或 .taiyi/config.json）");
  lines.push("");
  lines.push("配置示例 .taiyi/config.json:");
  lines.push('  { "scenario": "service", "defaultProfile": "api", "deliveryVerifyCmd": "npm test" }');

  return {
    ok: true,
    scenario: "service",
    slug: explicitSlug && engine.getState(explicitSlug) ? explicitSlug : undefined,
    profile,
    text: lines.join("\n"),
  };
}

export function runDesignSystemScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  const profile = SCENARIO_PROFILE["design-system"];
  const existing = resolveScenarioSlug(engine, titleOrSlug);
  if (existing.hasState && existing.slug) {
    return {
      ok: true,
      scenario: "design-system",
      slug: existing.slug,
      profile,
      text: shortScenarioLine("design-system", existing.slug, profile),
    };
  }

  const lines = scenarioHeader(
    "Taiyi 场景 · 设计系统",
    "profile **ui**（完整九阶段，UI 优先 harness）",
  );

  const explicitSlug = titleOrSlug?.trim();
  const looksLikeSlug = explicitSlug && /^[a-z0-9][a-z0-9-]*$/i.test(explicitSlug);
  if (explicitSlug && !engine.getState(explicitSlug)) {
    lines.push("1. 创建 ui 变更:");
    appendCreateHint(lines, explicitSlug, looksLikeSlug, profile);
  }

  lines.push("重点阶段:");
  lines.push("  ui-design → /taiyi:restyle · gstack plan-design-review");
  lines.push("  test → /taiyi:ui-test · playwright · accessibility");
  lines.push("  review → visual QA · /taiyi:gstack design-review");
  lines.push("");
  lines.push('config: { "scenario": "design-system", "defaultProfile": "ui" }');

  return {
    ok: true,
    scenario: "design-system",
    slug: explicitSlug && engine.getState(explicitSlug) ? explicitSlug : undefined,
    profile,
    text: lines.join("\n"),
  };
}

export function runCiScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  _titleOrSlug?: string,
): ScenarioRunResult {
  const workspaceDir = resolveWorkspaceFromTaiyiRoot(taiyiRoot);
  const cfg = loadProjectConfig(workspaceDir);

  const lines = scenarioHeader(
    "Taiyi 场景 · 成熟 DevOps",
    "已有 CI/CD 时 — 用 Taiyi 作变更追溯 + verify，不重复跑交付门",
  );

  lines.push("1. 配置 .taiyi/config.json:");
  lines.push("   {");
  lines.push('     "scenario": "devops",');
  lines.push('     "deliveryGate": false,');
  lines.push('     "commitTrailers": false,');
  lines.push('     "deliveryVerifyCmd": "npm run ci:verify"');
  lines.push("   }");
  lines.push("");
  lines.push("2. 日常命令:");
  lines.push("   npm run taiyi -- ci verify");
  lines.push("   npm run taiyi -- ci platform");
  lines.push("   有活跃变更时: /taiyi:verify · /taiyi:audit");
  lines.push("");
  lines.push("3. 仍需追溯时开 lite/spike 变更，integration 仅写 CHANGELOG");
  if (cfg.deliveryGate === false) {
    lines.push("");
    lines.push("✓ 当前项目 deliveryGate 已关闭");
  }

  return {
    ok: true,
    scenario: "ci",
    profile: "full",
    text: lines.join("\n"),
  };
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
