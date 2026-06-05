---
name: taiyi-integration
description: TaiyiForge 第 9 阶段 — 归档与 CHANGELOG，闭环沉淀。四端通用。
---

# taiyi-integration

## 目的

合并后**文档进仓、变更可追溯、可回滚**，关闭九阶段（或 lite 五阶段）循环。integration 是流程的「句号」，不是「可以不管了」。

## 何时使用

| 信号 | 建议 |
|------|------|
| 代码已合并 / 准备发版 | 必做 |
| `review` Verdict = Approve | 前置条件 |
| 所有必需阶段在 `state.completedPhases` | 引擎校验 |

## 输入

- 已合并代码（或即将合并的最终树）
- `REVIEW.md`（Approve）
- `CHANGE.md` Success Criteria
- `state.json` 完整历史

## 输出

- `.taiyi/changes/<slug>/CHANGELOG.md`

## 执行步骤

### 1. CHANGELOG 正文

按用户可见价值写（非仅内部 refactor）：

```markdown
## Added
- 大报表异步导出

## Changed
- 导出 API 返回 202 + job id

## Fixed
- ...

## Docs
- [ ] README 已更新
- [ ] AGENTS.md 已更新
```

### 2. Success Criteria 闭环

对照 CHANGE checkbox，在 CHANGELOG 或文末注明：

```markdown
## Success Criteria Met
- [x] SC-1: 集成测试 export-large 绿（见 TEST.md）
```

### 3. Rollback

可执行步骤：

- `git revert <sha>`
- feature flag 关闭
- DB migration down（若有）

### 4. 可选同步

```bash
scripts/taiyi-forge.sh sync-openspec <slug>   # TEST/REVIEW/CHANGELOG 一并映射
scripts/taiyi-forge.sh archive <slug>         # OpenSpec 归档
```

- gstack `document-release` — README/ARCHITECTURE 同步

### 5. 完成

`scripts/taiyi-forge.sh complete <slug> integration`

## 完成后

- `scripts/taiyi-forge.sh list` — 该 slug 应显示 integration 完成
- 可开新 slug 或 archive
- `state.auxiliaryCompleted` 保留供审计

## 与 profile

| Profile | 阶段数 |
|---------|--------|
| full | 9 |
| api | 8（无 ui-design） |
| lite | 5 |

CHANGELOG 长度门禁：lite 可短，但须有 Added/Changed/Fixed 之一。

## 与下游衔接

| 动作 | 时机 |
|------|------|
| OpenSpec archive | integration complete 后 |
| npm publish / tag | CHANGELOG 为 release notes 草稿 |
| 团队通报 | CHANGELOG Added/Fixed 摘要 |

## 质量自检

- [ ] CHANGELOG 与 CHANGE Success Criteria 对应
- [ ] Rollback 可执行（具体命令或步骤）
- [ ] Docs 勾选诚实（未改 README 勿勾）
- [ ] integration 前 review 已 Approve

## 禁止

- integration 未完成就 `archive`
- CHANGELOG 只写内部 refactor 无用户价值
- 跳过 Rollback（即使「难回滚」也要写风险）
- 未合并就写「已发布」
