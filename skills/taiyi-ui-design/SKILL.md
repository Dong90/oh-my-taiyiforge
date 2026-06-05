---
name: taiyi-ui-design
description: TaiyiForge 第 4 阶段 — UI/UX 契约，产出 UI-DESIGN.md。四端通用。
---

# taiyi-ui-design

## 目的

把 DESIGN 落到**界面层次、四态、无障碍**；无 UI 须显式 N/A。

## 何时跳过

- `init --profile api` → 引擎跳过本阶段
- 纯后端变更：勿编造 UI

## 输入

- `DESIGN.md`、`REQUIREMENT.md`

## 输出

- `.taiyi/changes/<slug>/UI-DESIGN.md`

## 执行步骤

1. **无 UI**：Scope 写 `N/A — 纯 API/后端`，Links 指向 DESIGN；满足校验即可 complete
2. **有 UI**：填 Layout、States 表（loading/empty/error/success）、Accessibility checklist
3. 大改版 → 先 `taiyi-restyle` 产出 `ui-restyle-tasks.md`
4. `npx taiyi complete <slug> ui-design`

## 无 UI 模板片段

```markdown
## Scope
N/A — 本变更无前端界面，验证通过 API/CLI 测试。

## Links
- DESIGN.md §Architecture
```

## 质量自检

- [ ] 有 UI 时 States + Accessibility 非空
- [ ] Links 指向 DESIGN 与 AC

## 禁止

- api profile 仍写大段 UI
- 无障碍 checklist 全空却声称有 UI
