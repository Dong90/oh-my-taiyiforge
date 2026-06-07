import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";

const WRAPPER_MARKER = "TAIYI-FORGE:PROJECT-WRAPPER";

/** 向消费方项目写入 scripts/taiyi-forge.sh，统一引擎调用路径 */
export function installProjectWrapper(cwd: string, pkgRoot: string): InstallResult {
  const src = path.join(pkgRoot, "scripts", "taiyi-forge.sh");
  const destDir = path.join(cwd, "scripts");
  const dest = path.join(destDir, "taiyi-forge.sh");

  if (path.resolve(cwd) === path.resolve(pkgRoot)) {
    return {
      target: "project-wrapper",
      path: dest,
      action: "skipped",
      detail: "pkg root — 已有 scripts/taiyi-forge.sh",
    };
  }

  if (!fs.existsSync(src)) {
    return {
      target: "project-wrapper",
      path: dest,
      action: "failed",
      detail: `missing wrapper template: ${src}`,
    };
  }

  const hasTaiyi = fs.existsSync(path.join(cwd, ".taiyi"));
  const hasPkg = fs.existsSync(path.join(cwd, "package.json"));
  const hasInstalledPkg = fs.existsSync(
    path.join(cwd, "node_modules", "oh-my-taiyiforge"),
  );
  const force = process.env.TAIYI_FORGE_FORCE_PROJECT_WRAPPER === "1";
  if (!force && !hasTaiyi && !hasPkg && !hasInstalledPkg) {
    return {
      target: "project-wrapper",
      path: dest,
      action: "skipped",
      detail:
        "no .taiyi/、package.json 或 node_modules/oh-my-taiyiforge（设 TAIYI_FORGE_FORCE_PROJECT_WRAPPER=1 强制）",
    };
  }

  fs.mkdirSync(destDir, { recursive: true });
  const body = fs.readFileSync(src, "utf8");
  const header = `#!/usr/bin/env bash\n# ${WRAPPER_MARKER} — synced by taiyi-forge-install\n`;
  const normalized = body.startsWith("#!/") ? body : header + body;
  fs.writeFileSync(dest, normalized, "utf8");
  fs.chmodSync(dest, 0o755);

  return {
    target: "project-wrapper",
    path: dest,
    action: "updated",
    detail: "scripts/taiyi-forge.sh → node_modules/oh-my-taiyiforge",
  };
}
