---
name: taiyi-ui-design
description: TaiyiForge 第 4 阶段 — UI/UX 契约，产出 UI-DESIGN.md。四端通用。
---

# taiyi-ui-design

## 目的

把 DESIGN 落到**界面层次、四态（loading/empty/error/success）、响应式与无障碍**；无 UI 变更须显式 N/A，避免空模板混过门禁。

## 何时使用

| 信号 | 建议 |
|------|------|
| `design` 已 complete 且 profile `full` | 必做 |
| `init --profile api` | **引擎跳过**，勿执行 |
| 有前端界面改动 | 必做；大改版加 `taiyi-restyle` |

## 何时跳过

- `api` / `lite` profile（见 `state.skippedPhases`）
- CHANGE Scope 明确无前端

## 输入

- `DESIGN.md`（组件与数据流）
- `REQUIREMENT.md`（用户故事）
- （大改版）`ui-restyle-tasks.md` from `taiyi-restyle`

## 输出

- `.taiyi/changes/<slug>/UI-DESIGN.md`

## 执行步骤

### 1. 判定是否有 UI

| 情况 | 动作 |
|------|------|
| 无 UI | Scope 写 `N/A — 纯 API/后端`，Links 指向 DESIGN；满足校验后 complete |
| 有 UI | 填完整契约（下节） |

### 2. 有 UI 时必填块

1. **Layout**：信息层级、断点（mobile/tablet/desktop）
2. **Components**：与 DESIGN 模块映射；新组件 vs 复用
3. **States 表**：

| 视图 | loading | empty | error | success |
|------|---------|-------|-------|---------|
| 导出列表 | skeleton | 空状态文案 | toast + 重试 | 下载按钮 |

4. **Accessibility checklist**：焦点顺序、aria-label、对比度、键盘操作
5. **Links**：指向 DESIGN §、REQUIREMENT US-*

### 3. 大改版

1. 先 `taiyi-restyle` → `ui-restyle-tasks.md`
2. UI-DESIGN 引用 R* 任务编号
3. TASK 阶段切片引用 R*

### 4. 完成

`scripts/taiyi-forge.sh complete <slug> ui-design`

## 无 UI 模板

```markdown
## Scope
N/A — 本变更无前端界面，验证通过 API/CLI 测试。

## Links
- DESIGN.md §Architecture
- REQUIREMENT.md US-1
```

## 与下游衔接

| 下游 | 需要 |
|------|------|
| `taiyi-task` | 视觉切片、R* 引用 |
| `taiyi-dev` | 四态实现顺序 |
| `taiyi-test` | a11y / 视觉回归范围 |

## 质量自检

- [ ] 有 UI 时 States 四列均有内容
- [ ] Accessibility 非空（有 UI 时）
- [ ] Links 指向 DESIGN 与 AC
- [ ] api profile 未写大段 UI

## 与铁三角

- gstack `plan-design-review` — 设计计划评审（可选）
- `taiyi-restyle` — 视觉改版任务清单

## 禁止

- api profile 仍编造界面
- 有 UI 但 Accessibility 全空
- 四态缺 error 处理
- 与 DESIGN 组件边界矛盾
