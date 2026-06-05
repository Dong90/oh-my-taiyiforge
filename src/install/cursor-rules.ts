import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";
import { homeDir } from "./paths.js";

const RULE_MARKER = "TAIYI-FORGE:CURSOR-RULE";

export function cursorRulesContent(): string {
  return `---
description: TaiyiForge 九阶段工作流 — 用 taiyi-* Skill + npx taiyi CLI 驱动 .taiyi/changes/
globs:
alwaysApply: true
---

# TaiyiForge（Cursor）

- 变更工件目录：\`.taiyi/changes/<slug>/\`
- 开始：\`npx taiyi init <slug> [--profile full|api|ui|lite] [--auto]\`
- **全自动（对齐架构图）**：\`--auto\` 后加载 **taiyi-orchestrator** Skill，每阶段先 \`npx taiyi harness <slug>\`，按清单执行铁三角→辅助→主流程，铁三角每步 \`npx taiyi harness-check <slug> <key>\`，再 \`complete\`
- 半自动：\`npx taiyi next <slug>\` → 加载 Skill → 填工件 → \`complete\`
- 辅助 Skill 完成后：\`npx taiyi mark-aux <slug> taiyi-health\` 等
- 无 UI 变更：\`--profile api\` 跳过 ui-design
- 小修复：\`--profile lite\` 五阶段精简路径

加载 Skill：读取 \`~/.cursor/skills/taiyi-<phase>/SKILL.md\` 并按 guide 执行。
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
