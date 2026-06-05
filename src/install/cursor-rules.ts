import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";
import { homeDir } from "./paths.js";

const RULE_MARKER = "TAIYI-FORGE:CURSOR-RULE";

export function cursorRulesContent(): string {
  return `---
description: TaiyiForge 九阶段工作流 — OMX 风格：Skill 写工件，Agent 代跑 taiyi-forge 引擎
globs:
alwaysApply: true
---

# TaiyiForge（Cursor 控制面）

## 原则（对齐 oh-my-codex / omc.sh）

1. **聊天里**：加载 \`taiyi-*\` 阶段 Skill、Superpowers、gstack 写工件与评审。
2. **引擎过关**：你用 **终端工具** 代跑 \`scripts/taiyi-forge.sh\`，**禁止**让用户手打 \`npx taiyi\`。
3. **禁止**未执行 \`complete\` 就声称阶段已完成。

## 引擎命令（项目根目录）

\`\`\`bash
./node_modules/oh-my-taiyiforge/scripts/taiyi-forge.sh init <slug> [--auto] --title "..."
./node_modules/oh-my-taiyiforge/scripts/taiyi-forge.sh next <slug>
./node_modules/oh-my-taiyiforge/scripts/taiyi-forge.sh harness <slug>
./node_modules/oh-my-taiyiforge/scripts/taiyi-forge.sh harness-check <slug> <key>
./node_modules/oh-my-taiyiforge/scripts/taiyi-forge.sh complete <slug> <phase>
./node_modules/oh-my-taiyiforge/scripts/taiyi-forge.sh list
\`\`\`

开发仓库内可用 \`scripts/taiyi-forge.sh\`；全局安装可用 \`taiyi-forge\`。

## Skill 加载

- 引擎：\`~/.cursor/skills/taiyi-forge/SKILL.md\`
- 编排：\`taiyi-orchestrator\`（\`--auto\`）
- 阶段：\`taiyi-change\` … \`taiyi-integration\`

## 变更目录

\`.taiyi/changes/<slug>/\` · 详见 \`docs/taiyi/control-plane.md\`
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
