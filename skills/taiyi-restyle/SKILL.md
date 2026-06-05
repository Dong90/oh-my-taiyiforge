---
name: taiyi-restyle
description: TaiyiForge 辅助 — UI 视觉改版任务清单（ui-restyle-tasks）。
---

# taiyi-restyle

## 何时使用

- `UI-DESIGN.md` 要求视觉改版但不宜塞进单个 dev slice

## 输出

- `.taiyi/changes/<slug>/ui-restyle-tasks.md`

## 任务清单格式

| # | 组件/页面 | 变更 | 验收 |
|---|-----------|------|------|
| 1 | | | 截图对比 / 设计 token |

## 原则

- 与 `taiyi-task` 对齐：每项可独立 PR
- 引用 `UI-DESIGN.md` 状态与无障碍要求
- 视觉改动仍需 `taiyi-test` / `taiyi-review` 证据
