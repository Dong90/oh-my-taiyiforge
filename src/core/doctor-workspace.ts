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
import { resolvePackageRoot } from "./package-root.js";
import { isProjectWrapperStale } from "../install/sync-project-wrapper.js";
import { listOrphanChangeDirs } from "./prune-changes.js";

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
  const pkgRoot = resolvePackageRoot(templatesMetaUrl);
  const isPkgRoot = path.resolve(workspaceDir) === path.resolve(pkgRoot);
  const wrapperCheck = isProjectWrapperStale(workspaceDir, pkgRoot);
  // pkg root 自己是引擎真源：scripts/taiyi-forge.sh 是完整 wrapper（非 stale consumer wrapper）
  checks.push({
    id: "project-wrapper",
    ok: fs.existsSync(wrapper) && (!wrapperCheck.stale || isPkgRoot),
    detail: isPkgRoot
      ? `pkg root 真源（scripts/taiyi-forge.sh = engine 完整 wrapper，177 行）`
      : fs.existsSync(wrapper) ? wrapperCheck.detail : wrapperCheck.detail,
  });

  const localPkg = path.join(workspaceDir, "node_modules", "oh-my-taiyiforge", "dist", "cli", "taiyi.js");
  const forgeRootFile = path.join(taiyiRoot, "forge-root");
  const envRoot = process.env.TAIYI_FORGE_ROOT?.trim();
  const forgeRoot =
    envRoot && fs.existsSync(path.join(envRoot, "dist", "cli", "taiyi.js"))
      ? envRoot
      : fs.existsSync(forgeRootFile)
        ? fs.readFileSync(forgeRootFile, "utf8").trim()
        : "";
  const pkgRootDistCli = fs.existsSync(path.join(pkgRoot, "dist", "cli", "taiyi.js"));
  const cliResolvable =
    fs.existsSync(localPkg) ||
    (forgeRoot !== "" && fs.existsSync(path.join(forgeRoot, "dist", "cli", "taiyi.js"))) ||
    (isPkgRoot && pkgRootDistCli);
  checks.push({
    id: "consumer-cli-resolvable",
    ok: cliResolvable,
    detail: cliResolvable
      ? envRoot
        ? `TAIYI_FORGE_ROOT=${envRoot}`
        : fs.existsSync(localPkg)
          ? localPkg
          : `.taiyi/forge-root → ${forgeRoot}`
      : "无法解析 taiyi CLI：npm install oh-my-taiyiforge 或 npx taiyi-forge-install --cursor",
  });

  const orphans = listOrphanChangeDirs(taiyiRoot);
  if (orphans.length > 0) {
    checks.push({
      id: "workflow-orphan-dirs",
      ok: false,
      detail: `${orphans.length} 个无 state.json 的 orphan 目录 — 运行 taiyi prune`,
    });
  }

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
