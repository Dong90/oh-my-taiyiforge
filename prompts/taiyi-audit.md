<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-audit.md -->
---
description: "TaiyiForge /taiyi:audit — delivery drift + git hygiene for a change"
argument-hint: "[slug] [--json] [--compact]"
---
User invoked **$taiyi-audit** (= `/taiyi:audit`). Run:

```bash
scripts/taiyi-forge.sh audit $ARGUMENTS
```

**流程/交付排查**（git 未入库、CHANGE 漂移、integration 交付门等）。非 doctor（安装）也非 review-check（仅 REVIEW.md）。

Agent 默认 `audit [slug] --json --compact`；单 active 变更可省略 slug。

对照：`/taiyi:verify` = 工件+ harness · `/taiyi:audit` = 交付闭环与漂移 · `/taiyi:doctor` = 安装

## Agent 协议（必须遵守）

1. 代跑 `scripts/taiyi-forge.sh audit [slug] --json --compact`。
2. 只摘 **high / 阻塞** findings；勿把完整 report 灌进聊天。
3. 与 `/taiyi:status` 的 `engineTruth` 对照；blockers 以引擎为准。
4. 用户只说 **`/taiyi:*` 斜杠**；禁止声称「已 audit」而未实际跑命令。

{{TAIYI_STAGE_PROTOCOL}}
