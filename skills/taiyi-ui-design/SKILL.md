---
name: taiyi-ui-design
description: TaiyiForge 第 4 阶段 — UI/UX 契约，产出 UI-DESIGN.md。
---

# taiyi-ui-design

## 目的

把 DESIGN 落到**界面层次、状态、无障碍**；无 UI 的变更也要显式声明 N/A。

## 输入

- `DESIGN.md`、`REQUIREMENT.md`

## 输出

- `.taiyi/changes/<slug>/UI-DESIGN.md`
- 模板：`templates/UI-DESIGN.md`

## 执行步骤

1. 若无 UI：写 **Scope: N/A**，说明纯后端/CLI 变更及验证方式
2. 若有 UI：主路径 + loading/empty/error/success 四态
3. Links 表指向 DESIGN 与 AC
4. 无障碍 checklist 不得全空勾选
5. 通过后：`taiyi complete <slug> ui-design`

## 可选

- 视觉大改时用 `taiyi-restyle` 生成 restyle 任务清单
