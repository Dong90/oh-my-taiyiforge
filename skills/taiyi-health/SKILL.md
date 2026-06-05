---
name: taiyi-health
description: TaiyiForge 辅助 — 代码健康检查报告（review 前可选）。
---

# taiyi-health

## 何时使用

- `taiyi-review` 之前，或大型变更中期检查

## 输出

- `.taiyi/changes/<slug>/health-report.md`

## 检查项（按项目实际工具）

| 维度 | 命令示例 |
|------|----------|
| 类型检查 | `tsc --noEmit` / `pyright` |
| Lint | `eslint` / `ruff` |
| 测试 | `npm test` / `pytest` |
| 死代码 | 项目既有工具 |

## 报告格式

- 每项：命令、退出码、摘要
- 阻塞项标 **BLOCK**；建议项标 **WARN**
- 不自动修复，修复留在 `taiyi-dev` 切片
