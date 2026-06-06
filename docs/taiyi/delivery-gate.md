# Integration 交付门（Delivery Gate）

## 问题

九阶段可在「代码未 commit / 工作区未干净」时 complete integration，导致 **流程闭环 ≠ 工程交付闭环**。

## 行为

`complete <slug> integration` 时，若工作区为 **git 仓库**（默认启用）：

1. 相对 `origin/develop`（或 `origin/main`）须有 **已 commit 的新增 diff**
2. 工作区须 **干净**（无 unstaged / staged / untracked）

非 git 目录（单测 tmpdir）自动跳过。

## 关闭（仅本地演示）

```bash
TAIYI_DELIVERY_GATE=0 npx taiyi complete <slug> integration --approver "你"
```

## 推荐流程

```
dev → commit → test → review Approve → PR → merge
  → integration（根 CHANGELOG + 回写 CHANGE checkbox）
  → sync-openspec → archive
```

## 相关修复（v0.22+）

| 修复 | 说明 |
|------|------|
| `normalizeState` | legacy `complexity: "medium"`、`currentPhase: "complete"` |
| `artifact-validator` | 拒绝 REQUIREMENT/DESIGN 纯占位模板 |
| `check-novel-derive-scope.sh` | 含工作区 + untracked（见 examples/dogfood-showcase） |
