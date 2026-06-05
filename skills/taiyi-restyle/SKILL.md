---
name: taiyi-restyle
description: TaiyiForge 辅助 — UI 视觉改版任务清单（ui-restyle-tasks）。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-restyle

## 目的

当 `UI-DESIGN.md` 要求**视觉层大面积改版**（token、间距、组件皮肤）时，把 work 拆成可独立 PR 的清单，避免塞进单个 dev slice 导致 review 不可审、回滚困难。

## 何时使用

| 信号 | 建议 |
|------|------|
| `taiyi_assess` 因 `hasUi` 推荐 | 考虑本 Skill |
| UI-DESIGN 含「改版 / 换肤 / 设计系统迁移」 | 必用 |
| 单组件颜色微调 | 否，留在 TASK 一条 |
| 无 UI（纯 API） | 跳过 |

## 输入

- `UI-DESIGN.md`、`DESIGN.md`（前端边界）
- `TASK.md`（避免重复编号）
- 设计 token / Figma 链接 / 截图（若有）
- （可选）`CONTEXT.md` 中的前端目录约定

## 输出

- `.taiyi/changes/<slug>/ui-restyle-tasks.md`
- 可选：每项对应 **截图基线路径** ` .taiyi/changes/<slug>/screenshots/before/`

## 任务拆分原则

1. **按用户旅程切片**，非按 CSS 文件：「登录页」「设置抽屉」优于「改 button.css」
2. 每项 **≤1 天** 量级；更大则再拆
3. 每项须 **可独立合并**（feature flag 或隔离路由若需要，写在任务里）
4. 先 **token / 基础组件**，后 **页面组合**（减连锁冲突）
5. 无障碍与响应式为**验收硬条件**，不是可选 follow-up

## 任务清单格式

```markdown
# UI Restyle Tasks: <slug>

> 来源：UI-DESIGN.md §… · 与 TASK.md 关系：补充视觉层，不替代功能任务

## Token / 基础层

| ID | 范围 | 变更 | 依赖 | 验收 |
|----|------|------|------|------|
| R1 | `styles/tokens.css` | 色板 v2 | — | 无回归 snapshot |
| R2 | `Button` 组件 | 圆角/阴影 | R1 | Storybook / 截图 |

## 页面层

| ID | 页面/流程 | 变更 | 依赖 | 验收 |
|----|-----------|------|------|------|
| R10 | `/settings` | 密度与侧栏 | R1,R2 | 桌面+移动截图 |

## 无障碍（横切）

| ID | 项 | 验收 |
|----|-----|------|
| A1 | 对比度 WCAG AA | axe / 手动表 |
| A2 | 焦点环可见 | 键盘录屏或截图 |
```

## 执行步骤

1. **读 UI-DESIGN**：提取 Components、States、Breakpoints、A11y 四块需求
2. **盘点影响面**：路由 → 页面组件 → 共享组件 → token（自下而上列表）
3. **建依赖图**：R2 依赖 R1；页面依赖基础组件——在表中填「依赖」列
4. **写验收**：每项必须 **可证据化**：
   - 截图对比（before/after 同视口）
   - 或设计工具标注一致
   - 或 `data-testid` + 视觉回归（若项目有）
5. **与 TASK.md 对齐**：
   - 功能任务 ID（T3）与视觉任务 ID（R10）交叉引用
   - 同一文件同时改逻辑+皮肤 → 拆两 PR 或标明顺序
6. **dev 执行**：每个 R* 对应 `taiyi-dev` 一切片或子 PR；完成在 TASK 或 CHANGELOG 勾 ID

## 与主流程

```
taiyi-ui-design → taiyi-task
       ↓
  taiyi-restyle（大改版时）
       ↓
   taiyi-dev（按 R1,R2,… 切片）
       ↓
   taiyi-test（含视觉/a11y 证据）
```

- `taiyi-test`：至少一条用例覆盖 **横切 A*** 清单
- `taiyi-review`：对照 ui-restyle-tasks 勾完成情况；缺截图 → Request changes

## 质量自检

- [ ] 每项有 **明确验收**，无「好看即可」
- [ ] 引用 `UI-DESIGN.md` 章节号或组件名
- [ ] 移动端与桌面若 UI-DESIGN 有要求，任务表分别列验收
- [ ] 未引入未在 UI-DESIGN 出现的 scope（新页面须回 requirement）

## 与铁三角

- **gstack `design-review` / `plan-design-review`**：评审结论中的「必改项」编入 R* 或 A*
- **Superpowers `verification-before-completion`**：合并前须有截图或 CI 视觉检查记录

## 禁止

- 在 restyle 清单里加后端/API 功能（回 TASK）
- 单 PR 改完全站皮肤（除非 CHANGE 明确允许 big-bang）
- 跳过无障碍横切项
- 用 restyle 绕过 `taiyi-ui-design` 未决的 Open Questions
