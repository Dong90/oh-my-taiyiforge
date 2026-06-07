import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";

const SCRIPTS: Record<string, string> = {
  "taiyi:doctor": "taiyi doctor --strict-workspace",
  "taiyi:verify": "taiyi verify",
};

/** 向消费方 package.json 合并 npm scripts 与可选 taiyi.deliveryVerifyCmd（不覆盖已有键） */
export function installConsumerPackageScripts(cwd: string): InstallResult {
  const pkgPath = path.join(cwd, "package.json");

  if (process.env.TAIYI_FORGE_SKIP_PKG_SCRIPTS === "1") {
    return {
      target: "project-wrapper",
      path: pkgPath,
      action: "skipped",
      detail: "TAIYI_FORGE_SKIP_PKG_SCRIPTS=1",
    };
  }

  const hasTaiyi = fs.existsSync(path.join(cwd, ".taiyi"));
  const hasPkg = fs.existsSync(pkgPath);
  const hasInstalledPkg = fs.existsSync(path.join(cwd, "node_modules", "oh-my-taiyiforge"));
  if (!hasTaiyi && !hasPkg && !hasInstalledPkg) {
    return {
      target: "project-wrapper",
      path: pkgPath,
      action: "skipped",
      detail: "无 .taiyi/、package.json 或 node_modules/oh-my-taiyiforge",
    };
  }

  if (!hasPkg) {
    return {
      target: "project-wrapper",
      path: pkgPath,
      action: "skipped",
      detail: "无 package.json",
    };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
      scripts?: Record<string, string>;
      taiyi?: { deliveryVerifyCmd?: string };
    };
    pkg.scripts ??= {};
    const added: string[] = [];
    for (const [key, cmd] of Object.entries(SCRIPTS)) {
      if (!pkg.scripts[key]) {
        pkg.scripts[key] = cmd;
        added.push(key);
      }
    }
    if (pkg.scripts.test && !pkg.taiyi?.deliveryVerifyCmd) {
      pkg.taiyi = { ...pkg.taiyi, deliveryVerifyCmd: "npm test" };
      added.push("taiyi.deliveryVerifyCmd");
    }
    if (added.length === 0) {
      return {
        target: "project-wrapper",
        path: pkgPath,
        action: "skipped",
        detail: "taiyi:* scripts / deliveryVerifyCmd 已存在",
      };
    }
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    return {
      target: "project-wrapper",
      path: pkgPath,
      action: "updated",
      detail: `package.json: ${added.join(", ")}`,
    };
  } catch (e) {
    return {
      target: "project-wrapper",
      path: pkgPath,
      action: "failed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}
