---
description: "TaiyiForge /taiyi:gstack — load any gstack Skill by name"
argument-hint: "<skill> e.g. design-shotgun autoplan canary gstack-upgrade"
---
User invoked **$taiyi-gstack** (= `/taiyi:gstack $ARGUMENTS`). 加载 **gstack `$ARGUMENTS`** Skill（第一个词为 skill 名；含空格的 skill 用连字符，如 `land-and-deploy`）。

**常用：**

| Skill | 场景 |
|-------|------|
| `design-shotgun` | ui-design — 多方案视觉探索 |
| `autoplan` | design/requirement — CEO+设计+工程+DX 一轮审完 |
| `canary` | integration/land 后 — 部署监控 |
| `gstack-upgrade` | 升级 gstack 工具链 |
| `plan-eng-review` · `plan-design-review` · `qa` · `review` · `ship` · `land-and-deploy` · `document-release` | 见 delivery-slash.md |

**步骤：**

1. `/taiyi:status [slug]`
2. 加载 **gstack `<skill>`** Skill（`$ARGUMENTS`）
3. 产出写入当前阶段工件（DESIGN.md / UI-DESIGN.md / TEST.md / REVIEW.md 等）
4. 可选：`scripts/taiyi-forge.sh harness-check <slug> gstack/<skill>`
5. 需要推进阶段时：`/taiyi:continue`（ship/land **不替代** integration 交付门）

快捷别名：`/taiyi:gstack review` · `/taiyi:gstack qa` · `/taiyi:release`（= document-release）

{{TAIYI_STAGE_PROTOCOL}}

{{GSTACK_INVOKE}}
