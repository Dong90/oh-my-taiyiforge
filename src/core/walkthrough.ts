import type { ChangeProfile } from "./types.js";
import { runDoctor } from "./doctor.js";
import { WorkflowEngine } from "./workflow-engine.js";
import { resolveTaiyiRoot } from "./paths.js";
import { resolveTemplatesDir, resolvePackageRoot } from "./package-root.js";
import { buildPhaseGuide } from "./phase-guide.js";
import { formatGuidePlain } from "./format-guide.js";

export type WalkthroughOptions = {
  slug?: string;
  profile?: ChangeProfile;
  title?: string;
};

export type WalkthroughStep = {
  label: string;
  ok: boolean;
  detail?: string;
};

export type WalkthroughResult = {
  ok: boolean;
  workspaceDir: string;
  slug: string;
  steps: WalkthroughStep[];
  nextText?: string;
  error?: string;
};

const DEFAULT_SLUG = "walkthrough-demo";

export function runWalkthrough(
  workspaceDir: string,
  opts: WalkthroughOptions = {},
): WalkthroughResult {
  const slug = opts.slug ?? DEFAULT_SLUG;
  const profile = opts.profile ?? "api";
  const pkgRoot = resolvePackageRoot(import.meta.url);
  const templatesDir = resolveTemplatesDir(import.meta.url);
  const steps: WalkthroughStep[] = [];

  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const engine = new WorkflowEngine(taiyiRoot, templatesDir);
  const existing = engine.getState(slug);

  if (!existing) {
    const doctorReport = runDoctor(pkgRoot);
    steps.push({
      label: "doctor",
      ok: doctorReport.ok,
      detail: doctorReport.ok ? "PASS" : "FAIL",
    });
    if (!doctorReport.ok) {
      return {
        ok: false,
        workspaceDir,
        slug,
        steps,
        error: "安装自检未通过，请运行: npx taiyi-forge-install --all",
      };
    }
  }

  if (!existing) {
    try {
      engine.initChange(slug, {
        title: opts.title ?? "Walkthrough API",
        templatesDir,
        profile,
      });
      steps.push({ label: "init", ok: true, detail: `${slug} (profile: ${profile})` });
    } catch (e) {
      steps.push({ label: "init", ok: false, detail: String(e) });
      return { ok: false, workspaceDir, slug, steps, error: String(e) };
    }
  } else {
    steps.push({ label: "init", ok: true, detail: `${slug} 已存在，继续演示` });
  }

  const state = engine.getState(slug);
  if (!state) {
    return { ok: false, workspaceDir, slug, steps, error: "无法读取 state.json" };
  }

  const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);
  const nextText = formatGuidePlain(guide);
  steps.push({ label: "next", ok: true });

  return { ok: true, workspaceDir, slug, steps, nextText };
}

export function formatWalkthroughPlain(r: WalkthroughResult): string {
  const lines: string[] = [];
  lines.push("═══ TaiyiForge 首次体验 ═══\n");
  for (const s of r.steps) {
    lines.push(`${s.ok ? "✓" : "✗"} ${s.label}${s.detail ? `: ${s.detail}` : ""}`);
  }
  if (r.nextText) {
    lines.push("\n─── 当前下一步 ───\n");
    lines.push(r.nextText);
  }
  if (r.ok) {
    lines.push("\n─── 常用命令 ───");
    lines.push(`  npx taiyi next ${r.slug}`);
    lines.push("  npx taiyi list");
    lines.push(`  npx taiyi complete ${r.slug} change   # 填好 CHANGE.md 后`);
    lines.push("\n完整九阶段: 见 docs/QUICKSTART.md 或 npm run dogfood（仓库内）");
  } else if (r.error) {
    lines.push(`\n✗ ${r.error}`);
  }
  return lines.join("\n");
}
