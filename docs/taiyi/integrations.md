# TaiyiForge × 铁三角集成

与《AI 驱动研发流程与工具选型指南》对齐：TaiyiForge 管**九阶段工件 + 双门禁**，下列工具管各自专长，**可并存**。

## OpenSpec（规范层）

| TaiyiForge 阶段 | OpenSpec 动作 |
|-----------------|---------------|
| change / requirement | 可用 `openspec proposal` 起草；工件落在 `.taiyi/changes/<slug>/` |
| integration | 合并后 **`taiyi_archive`** 或 `openspec archive <slug> -y`，规格进主库 |

**约定**：`CHANGE.md` / `REQUIREMENT.md` 为仓库内真源；OpenSpec 为可选上游或归档目标。

## Superpowers（纪律层）

| TaiyiForge 阶段 | Superpowers Skill |
|-----------------|-------------------|
| change | `brainstorming` — 先澄清再写 CHANGE |
| task / dev | `test-driven-development` — 与 `taiyi-dev` TDD 纪律一致 |
| review 前 | `verification-before-completion` — 证据先于「完成」声明 |

在 OpenCode：`use skill tool to load superpowers/brainstorming`

## gstack / OMO（闭环层）

| TaiyiForge 阶段 | gstack 命令 |
|-----------------|-------------|
| review | `gstack review` — PR 合并前结构审查 |
| test 后 | `gstack qa` — 站点/流程 QA |
| integration | `gstack document-release` — 文档与 CHANGELOG 同步 |

**OMO**：`taiyi_complete` 的 `approver` 字段记录人工审批者；high 级 REVIEW 未解决不得 Approve。

## 推荐串联（单变更）

```text
taiyi_init → taiyi_guide（每步）
  → taiyi-change … taiyi-integration
  → （可选）taiyi_sync_openspec → taiyi_archive
  → gstack review → merge → gstack document-release
```

## OpenCode 工具一览

| 工具 | 用途 |
|------|------|
| `taiyi_init` | 建变更 + 铺模板 |
| `taiyi_guide` | 当前该做什么 |
| `taiyi_status` | 状态 + guide |
| `taiyi_complete` | 完成阶段（含质量校验） |
| `taiyi_assess` | 复杂度与辅助 skill 建议 |
| `taiyi_sync_openspec` | 将 `.taiyi/changes/<slug>/` 工件拷贝到 `openspec/changes/<slug>/` |
| `taiyi_archive` | 九阶段完成后调用 OpenSpec archive（需 `openspec/changes/<slug>/`） |

`taiyi_status` 的 `openspec` 字段会显示是否检测到 OpenSpec 及建议命令。
