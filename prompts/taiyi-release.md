---
description: "TaiyiForge /taiyi:release — gstack document-release (integration docs sync)"
argument-hint: "[optional slug]"
---
User invoked **$taiyi-release** (= `/taiyi:release` · `/taiyi:gstack release`). 加载 **gstack `document-release`** — 同步 README/ARCHITECTURE/CHANGELOG 等（integration 阶段 optional）。

1. `/taiyi:status` — integration 或刚 `/taiyi:land` 之后
2. 加载 **gstack `document-release`** Skill
3. 与 `@taiyi-integration` 工件对齐后 `/taiyi:continue` integration
4. 可选：`scripts/taiyi-forge.sh harness-check <slug> gstack/document-release`

{{TAIYI_STAGE_PROTOCOL}}

{{GSTACK_INVOKE}}
