# 第三方调用路由与 Agent / 引擎边界

> **去重选型**：[library-selection.md](./library-selection.md) — 重叠能力只留最强库。  
> **真源**：`phases.yaml` · `workflow-manifest.yaml` · `providers.yaml` · `CAPABILITY_SKILL_HINTS`

## 谁做什么

| 角色 | 职责 | 怎么触发 |
|------|------|----------|
| **Agent（IDE）** | Superpowers 纪律 + ECC 深度 Skill | `/taiyi:skill sp\|ecc …` · `@taiyi-*` |
| **引擎（shell）** | 工件门禁 + 少量 CLI | `taiyi-forge.sh harness` · `runCapability` |

**引擎不会**代跑 Superpowers / ECC 的 LLM Skill。

## 去重后仍走 capabilities 的项（引擎/单轨）

| Capability | Provider | 阶段 | 说明 |
|------------|----------|------|------|
| `spec_sync` | openspec | requirement | 可选 CLI |
| `spec_archive` | openspec | integration | 必选归档 |
| `e2e_test` | playwright | test | E2E 证据 |
| `version_release` | changesets | integration | 版本 bump CLI |

**已移出九阶段 manifest**（改由 harness 指定库）：`eng_review` · `design_review` · `code_review` · `browser_qa` · `doc_release` · `accessibility` · `design_guidelines` · `sast_scan` · `vuln_scan`。  
需要时可写回 `.taiyi/providers.yaml` 的 `assignments`（含 legacy 条目）。

## manifest harness 分工

| 库 | 职责 |
|----|------|
| **Superpowers** | brainstorming · writing-plans · TDD · verification · 派审 · subagent · finishing-branch |
| **ECC** | architecture-audit · patterns · UI/a11y · coverage/eval · security-scan · CL/压缩/changelog |
| **特例 CLI** | `openspec change show` · `taiyi archive` |

## Agent 入口

```
/taiyi:skill sp brainstorming
/taiyi:skill sp tdd dev
/taiyi:skill ecc architecture-audit   # 或 @ecc-architecture-audit
/taiyi:handoff                        # 会话续作（替代 checkpoint）
```

## auto 打卡

```bash
scripts/taiyi-forge.sh harness-check <slug> superpowers/test-driven-development
scripts/taiyi-forge.sh harness-check <slug> ecc/security-scan
```

安装：`npx taiyi-forge-install --all`
