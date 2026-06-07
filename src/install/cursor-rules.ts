import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";
import { homeDir } from "./paths.js";
import { taiyiControlPlaneBody } from "./control-plane-markdown.js";

const RULE_MARKER = "TAIYI-FORGE:CURSOR-RULE";

export function cursorRulesContent(): string {
  return `---
description: TaiyiForge 九阶段工作流 — OMX 风格：Skill 写工件，Agent 代跑 taiyi-forge 引擎
globs:
alwaysApply: true
---

# TaiyiForge（Cursor 控制面）

${taiyiControlPlaneBody("cursor")}
`;
}

export function installCursorRules(cursorDir: string): InstallResult {
  const rulesDir = path.join(path.dirname(cursorDir), "rules");
  const dest = path.join(rulesDir, "taiyiforge.mdc");
  try {
    fs.mkdirSync(rulesDir, { recursive: true });
    const body = cursorRulesContent();
    const wrapped = `<!-- ${RULE_MARKER}:START -->\n${body}\n<!-- ${RULE_MARKER}:END -->\n`;
    const action = fs.existsSync(dest) ? "updated" : "created";
    fs.writeFileSync(dest, wrapped, "utf8");
    return { target: "cursor", path: dest, action, detail: "taiyiforge.mdc rule" };
  } catch (e) {
    return {
      target: "cursor",
      path: dest,
      action: "failed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

export function defaultCursorRulesPath(): string {
  return path.join(homeDir(), ".cursor", "rules", "taiyiforge.mdc");
}
