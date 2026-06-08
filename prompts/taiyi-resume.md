---
description: "TaiyiForge /taiyi:resume — restore session from HANDOFF.md + status"
argument-hint: "[optional slug]"
---
User invoked **$taiyi-resume** (= `/taiyi:resume`). **从 HANDOFF 恢复**（与 `/taiyi:handoff` 配对）。

1. 若多变更：`scripts/taiyi-forge.sh list`
2. 读 `.taiyi/changes/<slug>/HANDOFF.md`（若存在；slug 来自 `$ARGUMENTS` 或唯一 active）
3. 运行：
   ```bash
   scripts/taiyi-forge.sh status $ARGUMENTS
   ```
4. 向用户汇总：**HANDOFF 备注** + **status 当前阶段** + **下一步斜杠**（continue / apply / 当前阶段 `@taiyi-*` 或 `/taiyi:write`）
5. **不要**自动 continue 或改代码，除非用户明确要求

无 HANDOFF.md 时：仅展示 status，提示可用 `/taiyi:handoff` 暂停。

{{TAIYI_STAGE_PROTOCOL}}
