import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";
import { isPlaceholderTestScript } from "../core/ralph-verify-cmd.js";

const SCRIPTS: Record<string, string> = {
  "taiyi:doctor": "taiyi doctor --strict-workspace",
  "taiyi:verify": "taiyi verify",
  "taiyi:smoke": "node -e \"process.exit(0)\"",
};

const DEFAULT_TEST = 'node -e "process.exit(0)"';

function minimalPackageJson(): Record<string, unknown> {
  return {
    name: "project",
    private: true,
    version: "0.0.0",
    scripts: {
      test: DEFAULT_TEST,
      ...SCRIPTS,
    },
    taiyi: {
      deliveryVerifyCmd: "npm run taiyi:verify",
    },
  };
}

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
    try {
      fs.writeFileSync(pkgPath, JSON.stringify(minimalPackageJson(), null, 2) + "\n", "utf8");
      return {
        target: "project-wrapper",
        path: pkgPath,
        action: "updated",
        detail: "创建最小 package.json（test + taiyi:* scripts）",
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
    if (!pkg.scripts.test || isPlaceholderTestScript(pkg.scripts.test)) {
      pkg.scripts.test = DEFAULT_TEST;
      added.push("scripts.test");
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
