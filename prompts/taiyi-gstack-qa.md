---
description: "TaiyiForge /taiyi:gstack qa — gstack site QA (test phase optional)"
argument-hint: "[optional slug]"
---
User invoked **$taiyi-gstack-qa** (= `/taiyi:gstack qa`). 加载 **gstack `qa`** — 站点/流程 QA（test 阶段 **optional**）。

1. `/taiyi:status` — 通常在 **test** 或 dev 完成后
2. 加载 **gstack `qa`** Skill — browse 真机/headless 测关键路径
3. 证据补充进 **TEST.md** 或 `@taiyi-test` 工件
4. 可选：`scripts/taiyi-forge.sh harness-check <slug> gstack/qa`
5. `/taiyi:continue`

{{TAIYI_STAGE_PROTOCOL}}

{{GSTACK_INVOKE}}
