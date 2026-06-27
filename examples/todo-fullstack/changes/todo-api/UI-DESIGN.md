---
phase: ui-design
skill: taiyi-ui-design
gate: auto
produces: UI-DESIGN.md
upstream: [design, requirement]
downstream: [task, dev]
---
<!-- phase:ui-design skill:taiyi-ui-design gate:auto est:20min produces:UI-DESIGN.md upstream:[design,requirement] downstream:[task,dev] cplx:[ALL]5steps +[M+]2 +[H]1 -->
# UI-DESIGN: E2E Demo

> **Scope**: CLI/workflow only; no user interface surfaces.

---

## Step 1: Component Inventory

> **样式契约**（Strict — 所有代码强制遵守）
> - _待选定 CSS 方案（Tailwind / CSS Modules / styled-components）_
> - _内联样式禁止策略_
> - _主题变量规则_
> 
> <!-- Validate: CSS 方案单一无混用？无内联 style？颜色/间距/字体仅用主题变量？ -->
> **[ALL]** Goal: 知道改了什么 | Inputs: DESIGN.md §2
<!-- Action: 页面/组件+操作(新增/修改)+路径+变更描述 -->

| 页面/组件 | 操作 | 路径 | 变更 |
|----------|------|------|------|
| _N/A — CLI/workflow only; no user interface surfaces._ |

<!-- Validate: 公共组件(Header/Footer/ErrorBoundary)是否遗漏？ -->

## Step 2: Component Tree
> **[ALL]** Goal: 一眼看清层级 | Inputs: Step1
<!-- Action: ASCII/Mermaid组件树，标注props和state -->

```
_N/A — CLI/workflow only; no user interface surfaces._
```

<!-- Validate: 所有状态分支都在树中？Props定义清晰？ -->

## Step 3: State Matrix
> **[ALL]** Goal: 每个状态有视觉 | Inputs: Step2
<!-- Action: 每组件6状态: Default/Loading/Empty/Error/Success/Edge -->

- **N/A**: CLI-only change, no UI state machine

<!-- Validate: 6状态全覆盖？每个有视觉描述？ -->

## Step 4: Interaction Edge Cases
> **[ALL]** Goal: 交互边界不翻车 | Inputs: Step3
<!-- Action: gstack PD#4: 9种交互边界全覆盖 -->

| 边界 | 行为 |
|------|------|
| Double-click | 按钮disabled防重复提交 |
| Navigate away | |
| Slow (>3s) | |
| Stale state | |
| Concurrent tabs | |
| Back button | |
| Zero state | |
| Max input | |
| Offline | |

<!-- Validate: 9种全覆盖？每个有具体行为？ -->

## Step 5: Responsive Breakpoints
> **[MEDIUM+]** Goal: 多端都可用 | Inputs: Step1+2
<!-- Action: Mobile<768 / Tablet768-1024 / Desktop>1024 -->

| 断点 | 宽度 | 布局变化 |
|------|------|---------|
| N/A | — | CLI-only change, no responsive layout |

<!-- Validate: Mobile触控≥44px？关键交互可用？ -->

## Step 6: Motion Spec
> **[MEDIUM+]** Goal: 动效有规范 | Inputs: Step3
<!-- Action: 交互→触发→效果→时长。考虑prefers-reduced-motion -->

| 交互 | 触发 | 动效 | 时长 |
|------|------|------|------|
| _N/A — CLI/workflow only; no user interface surfaces._ |

<!-- Validate: 动效增强可用性而非纯装饰？有reduced-motion方案？ -->

## Step 7: Accessibility
> **[ALL]** Goal: WCAG AA底线 | Inputs: Step1+3+4
<!-- Action: label/键盘/role/颜色/焦点/对比度/触控≥44px/sr友好 -->

- [ ] N/A — CLI only
- [ ] No visual interface to audit

<!-- Validate: 跑过axe/Lighthouse a11y审计？ -->

## Step 8: Design Token Alignment
> **[HIGH]** Goal: 视觉一致 | Inputs: DESIGN.md(项目级)
<!-- Action: Token值+来源。主色/错误色/圆角/间距/字体 -->

| Token | 值 | 来源 |
|-------|-----|------|
| _N/A — CLI/workflow only; no user interface surfaces._ |

<!-- Validate: 新增组件复用现有Token？与DESIGN.md一致？ -->

## References
- DESIGN.md: inline script vs vitest
- REQUIREMENT.md AC: US-1

---
## Quality Gate
<!-- Evidence-first: 用实际渲染截图验证，非凭感觉。gstack PD#4: 交互边界9场景全覆盖 -->

- [ ] S1 组件清单完整
- [ ] S2 组件树清晰
- [ ] S3 6状态全覆盖
- [ ] S4 9种交互边界全覆盖 | gstack PD#4
- [ ] [M+] S5 响应式断点已定义
- [ ] [M+] S6 动效有规范(含prefers-reduced-motion)
- [ ] [ALL] S7 WCAG AA已覆盖 | axe/Lighthouse审计通过
- [ ] [H]  S8 Design Token对齐
