import fs from "node:fs";
import path from "node:path";
import type { DoctorCheck } from "./doctor.js";
import { listChanges } from "./list-changes.js";
import { resolveActiveSlug } from "./active-slug.js";
import { buildPhaseGuide } from "./phase-guide.js";
import { formatPhaseProgressLine } from "./format-guide.js";
import { handoffExists } from "./handoff.js";
import { WorkflowEngine } from "./workflow-engine.js";
import { resolveTemplatesDir } from "./package-root.js";

/** 工作区流程检查 — 对标 omc-doctor 的 active mode / state 诊断 */
export function runDoctorWorkspace(
  workspaceDir: string,
  taiyiRoot: string,
  templatesMetaUrl: string,
): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const changesDir = path.join(taiyiRoot, "changes");

  if (!fs.existsSync(changesDir)) {
    checks.push({
      id: "workflow-changes-dir",
      ok: true,
      detail: "无 .taiyi/changes/（尚未 new）",
    });
    return checks;
  }

  const all = listChanges(taiyiRoot);
  const active = all.filter((c) => c.workflowActive);
  const aborted = all.filter((c) => c.workflowAborted);

  checks.push({
    id: "workflow-active-count",
    ok: active.length <= 1,
    detail:
      active.length === 0
        ? "无进行中变更"
        : active.length === 1
          ? `1 个 active: ${active[0]!.slug}`
          : `多个 active（${active.map((c) => c.slug).join(", ")}）— 须 /taiyi:list 并指定 slug`,
  });

  if (aborted.length > 0) {
    checks.push({
      id: "workflow-aborted",
      ok: true,
      detail: `${aborted.length} 个 aborted（不计入 active）`,
    });
  }

  const wrapper = path.join(workspaceDir, "scripts", "taiyi-forge.sh");
  checks.push({
    id: "project-wrapper",
    ok: fs.existsSync(wrapper),
    detail: fs.existsSync(wrapper)
      ? wrapper
      : "缺少 scripts/taiyi-forge.sh — 运行 npx taiyi-forge-install --cursor",
  });

  const resolved = resolveActiveSlug(taiyiRoot);
  if (!resolved.ok) {
    if (active.length > 1) {
      checks.push({
        id: "workflow-infer-slug",
        ok: false,
        detail: resolved.error,
      });
    }
    return checks;
  }

  const engine = new WorkflowEngine(taiyiRoot, resolveTemplatesDir(templatesMetaUrl));
  const state = engine.getState(resolved.slug);
  if (!state) return checks;

  const guide = buildPhaseGuide(taiyiRoot, resolved.slug, state, workspaceDir);
  const progress = formatPhaseProgressLine(guide);

  checks.push({
    id: "workflow-current-phase",
    ok: !guide.stepBlockers?.length,
    detail: guide.stepBlockers?.length
      ? `${progress} · 顺序冲突: ${guide.stepBlockers.join("; ")}`
      : progress,
  });

  if (guide.earlyCodeWarning) {
    checks.push({
      id: "workflow-early-code",
      ok: false,
      detail: guide.earlyCodeWarning,
    });
  } else {
    checks.push({
      id: "workflow-early-code",
      ok: true,
      detail: "dev 前无业务代码漂移",
    });
  }

  const changeDir = path.join(changesDir, resolved.slug);
  if (handoffExists(changeDir)) {
    checks.push({
      id: "workflow-handoff",
      ok: true,
      detail: `${resolved.slug}/HANDOFF.md 存在 — 恢复时先 /taiyi:status`,
    });
  }

  return checks;
}
