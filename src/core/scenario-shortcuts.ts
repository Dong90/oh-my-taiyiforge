import type { WorkflowEngine } from "./workflow-engine.js";
import { resolveActiveSlug } from "./active-slug.js";
import { resolveTaiyiRoot } from "./paths.js";

export type ScenarioRunResult = {
  ok: boolean;
  scenario: "feature" | "bug";
  slug?: string;
  text: string;
};

function scenarioHeader(title: string, subtitle: string): string[] {
  return [`══ ${title} ══`, subtitle, ""];
}

/** /taiyi:feature — 新功能（full 九阶段）场景剧本 */
export function runFeatureScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  const lines = scenarioHeader(
    "Taiyi 场景 · 做功能",
    "profile **full**（九阶段）· 用户给标题则先 new，否则用当前 slug",
  );

  const explicitSlug = titleOrSlug?.trim();
  const looksLikeSlug = explicitSlug && /^[a-z0-9][a-z0-9-]*$/i.test(explicitSlug);
  const hasState = looksLikeSlug && engine.getState(explicitSlug);

  if (!hasState && explicitSlug && !looksLikeSlug) {
    lines.push("1. 创建变更:");
    lines.push(`   scripts/taiyi-forge.sh new ${explicitSlug}`);
    lines.push("   （默认手动；全自动加 --auto）");
    lines.push("");
  } else if (!explicitSlug) {
    const resolved = resolveActiveSlug(taiyiRoot);
    if (!resolved.ok) {
      lines.push("无活跃变更 → 先:");
      lines.push('  /taiyi:new <功能标题>   例: /taiyi:new 用户登录');
      return { ok: false, scenario: "feature", text: lines.join("\n") };
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
  lines.push("  → /taiyi:tdd plan → /taiyi:tdd dev · /taiyi:ralph");
  lines.push("  → /taiyi:e2e · /taiyi:gstack qa");
  lines.push("  → /taiyi:review-loop · /taiyi:security");
  lines.push("  → /taiyi:commit → /taiyi:verify → /taiyi:ship → /taiyi:land");
  lines.push("  → /taiyi:integration → /taiyi:archive");
  lines.push("");
  lines.push("总览: /taiyi:flow · 全自动: /taiyi:autopilot（须 --auto）");

  return {
    ok: true,
    scenario: "feature",
    slug: hasState ? explicitSlug : undefined,
    text: lines.join("\n"),
  };
}

/** /taiyi:bug — 修 bug（lite 五阶段）场景剧本 */
export function runBugScenario(
  engine: WorkflowEngine,
  taiyiRoot: string,
  titleOrSlug?: string,
): ScenarioRunResult {
  const lines = scenarioHeader(
    "Taiyi 场景 · 修 Bug",
    "profile **lite** — 跳过 design / ui-design / task / review",
  );

  const explicitSlug = titleOrSlug?.trim();
  const looksLikeSlug = explicitSlug && /^[a-z0-9][a-z0-9-]*$/i.test(explicitSlug);
  const hasState = looksLikeSlug && engine.getState(explicitSlug);

  if (!hasState) {
    lines.push("1. 创建 lite 变更:");
    if (explicitSlug && !looksLikeSlug) {
      lines.push(`   scripts/taiyi-forge.sh new ${explicitSlug} --profile lite`);
    } else if (explicitSlug && looksLikeSlug) {
      lines.push(`   scripts/taiyi-forge.sh init ${explicitSlug} --profile lite --title "fix"`);
    } else {
      lines.push('   /taiyi:new <bug 描述> --profile lite');
    }
    lines.push("");
  } else {
    lines.push(`slug: **${explicitSlug}**（确认 profile=lite）`);
    lines.push("");
  }

  lines.push("lite 路径（每阶段 /taiyi:write + /taiyi:continue）:");
  lines.push("  change → requirement → dev → test → integration");
  lines.push("");
  lines.push("  /taiyi:write · /taiyi:tdd dev · /taiyi:ralph");
  lines.push("  /taiyi:test · /taiyi:e2e（若有 UI 回归）");
  lines.push("  /taiyi:integration · /taiyi:commit · /taiyi:archive");
  lines.push("");
  lines.push("无 REVIEW.md / review-loop；仍须 TEST.md 证据 + integration 交付门");

  return {
    ok: true,
    scenario: "bug",
    slug: hasState ? explicitSlug : undefined,
    text: lines.join("\n"),
  };
}
