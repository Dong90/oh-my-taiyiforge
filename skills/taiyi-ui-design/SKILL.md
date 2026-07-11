---
name: taiyi-ui-design
description: TaiyiForge 第 4 阶段 — UI/UX 契约，产出 UI-DESIGN.md。四端通用。
paradigm: Partner
---

# taiyi-ui-design — UI/UX 设计契约

> 进入本阶段前请优先读 `.taiyi/changes/<slug>/PHASE-CONTEXT.md`（~500 tokens），不要全量加载上游工件。如果 PHASE-CONTEXT 包含 upstream 文档（如 REQUIREMENT.md）的参考节，优先阅读参考节而非完整上游文件。

## 框架集成

本阶段使用以下框架：

| 框架 | 用途 | 何时加载 |
|------|------|---------|
| **Harness** | 阶段门禁与推进（`status` → `continue`；legacy：`npx taiyi complete`） | 全程 |
| **OMO** | 作为前端设计工作流入口 | 全程 |

**Superpowers / GStack / OpenSpec / Spec-Kit** 在本阶段不涉及。

## 前置门禁（Pre-flight）

### 0.1 入口判定
- DESIGN.md 已过关（`engineTruth` 确认）
- UI-DESIGN.md 不应包含后续阶段的实现代码（TASK / DEV / TEST）

### 0.2 Profile 判定

| Profile | UI-DESIGN.md 要求 |
|---------|------------------|
| `full` | 完整：布局原型 + 交互/动效 + UI 组件拆解 + 无障碍 + 状态+异常 + 与 DESIGN.md 差异 |
| `ui` | 同 full |
| `api` | 跳过（无 UI 层） |
| `lite` | 可选。如果有 UI，简化到布局原型 + 组件拆解即可 |
| `spike/micro` | 跳过 |
| `nano` | 跳过 |

### 0.3 前置检查清单
- [ ] design 阶段已过关
- [ ] 项目有 UI 层（如不是跳过）

---

## 步骤

### 工件契约

| 层 | 路径 | 职责 |
|----|------|------|
| **语义真源** | `ui-design.json` | Zod（`src/schemas/ui-design.ts`） |
| **生成视图** | `UI-DESIGN.md` | hbs（`src/templates/ui-design.hbs`） |
| **流程** | 本 Skill | Must/Should/Could、组件拆解、无障碍 |

**工作流**：编辑 json → `scripts/taiyi-forge.sh render <slug> ui-design` → `status` → `continue`。

详见 [`docs/taiyi/artifact-contract.md`](../../docs/taiyi/artifact-contract.md)。

### json 字段（Zod 摘要）

| 字段 | 要求 |
|------|------|
| `title` | 设计标题 |
| `scope` | UI 范围说明 |
| `styling_contract` | 可选；CSS 方案、禁止内联、主题变量规则 |
| `states` | 可选；loading / empty / error 等状态描述 |
| `accessibility` | 可选；键盘 / 焦点 / ARIA / 对比度清单 |
| `links` | 可选；Figma / 设计稿链接 |
| `is_cli_only` | 可选；纯 CLI 无 UI 时标注 |

### 写作指引（填入 json，render 生成 UI-DESIGN.md）

### 1. 确认已有 UI 基础设施

先 grep 项目中的 UI 基础设施（Tailwind / Shadcn / 组件库 / 设计 Token）并记录路径，后续组件拆解直接引用。

```
# grep -r "tailwind" package.json 2>/dev/null && echo "Tailwind found"
# grep -r "shadcn" package.json 2>/dev/null && echo "Shadcn found"
# grep -rn "taiyi-design-tokens" src/ 2>/dev/null || grep -rn "--color-" src/components/ 2>/dev/null | head -5
```

### 2. 产出 UI-DESIGN.md

每段用 Must / Should / Could 标记约束强度。结构如下：

```
# UI-DESIGN: <标题>

## 1. 布局原型
MUST 布局结构描述（文字或用 ASCII / Mermaid 图），不贴最终代码。

### 1.1 接口总览
MUST [以接口为单位描述布局]

### 1.2 页面层级（路由树）
MUST [路由或面板切换逻辑]
```

### 3. 交互与动效

```
## 2. 交互与动效
### 2.1 状态过渡
MUST [加载/空/错误态组件]
### 2.2 微交互
SHOULD [hover / focus / enter / exit 动画描述]
### 2.3 反馈机制
MUST [Toast / 确认弹窗 / 进度指示]
```

### 4. UI 组件拆解

```
## 3. UI 组件拆解
### 3.1 新组件清单
-
### 3.2 受影响已有组件
-
```

### 5. 无障碍

```
## 4. 无障碍
MUST [键盘导航 / 焦点管理 / Aria labels / 色差对比度]
```

### 6. 状态与异常

```
## 5. 状态与异常
### 5.1 正常状态
- [数据加载完成展示]
### 5.2 中间态
- Loading / 骨架屏
- 乐观更新中
### 5.3 空态
- 无数据时的默认 UI
### 5.4 异常
- 网络断开 / API 403 / 400 校验错误
```

### 7. 与 DESIGN.md 的差异（若有）

```
## 6. 与 DESIGN.md 的差异
| 维度 | DESIGN.md | UI-DESIGN.md | 理由 |
|------|-----------|-------------|------|
```
仅在 UI-DESIGN.md 偏离了 DESIGN.md 架构决策时才需要此节。如完全遵循则说明"严格遵循 DESIGN.md"。

---

## 过关（Harness）

1. 逐项检查 `## 质量自检`；有未通过项则不要过关。
2. 预检：`scripts/taiyi-forge.sh status <slug> --json --compact` — 解析 `engineTruth`（`qualityReady` / `blockers`）。
3. 用户确认后过关：`scripts/taiyi-forge.sh continue <slug>`。
4. 过关后再 `status --json --compact`，读 `engineTruth`；若 `currentPhase` 已变为 `task`，切换到 taiyi-task Skill 并通知用户。

Legacy：`npx taiyi complete <slug> ui-design` 仍可用；聊天优先 `/taiyi:continue`。

## 产出

- `.taiyi/changes/<slug>/UI-DESIGN.md`
- `.taiyi/changes/<slug>/ui-design.json`

## 与下游衔接

| 下游 | 需要 |
|------|------|
| `taiyi-task` | 组件拆解 → 开发任务粒度；交互/动效 → 实现复杂度估算 |
| `taiyi-dev` | 布局原型 → 样式实现参考；组件清单 → 需要创建的文件；设计 Token → 颜色/间距变量的统一使用 |

## 异常处理

| 场景 | 处理 |
|------|------|
| 项目无 UI 层 | 跳过本阶段（api profile），说明理由 |
| DESIGN.md 未过关（phase guard） | 展示 DESIGN 未完成，退回完成 DESIGN |
| UI-DESIGN.md 与已有设计 Token 冲突 | 引用已有的设计 Token，不要在 UI-DESIGN 中重新定义 |
| `continue` 被拒 | 检查 6 sections 是否完整、Must/Should/Could 是否标注。修复后 status 再 continue。**最多 1 次自动重试** |
| 误过关本阶段或后续 | `scripts/taiyi-forge.sh undo <slug> ui-design` |

<fatal_constraints>
- NEVER write actual CSS, React components, or implementation code in ui-design.json / rendered UI-DESIGN.md — this is a design contract, not implementation.
- NEVER hardcode hex colors — reference design tokens from Tailwind config or existing DESIGN.md.
- NEVER skip Must/Should/Could strength markers on constraints.
- NEVER add UI concepts not traceable to REQUIREMENT.md or DESIGN.md.
- NEVER skip the 空态/异常/Loading sections — they are part of the design, not optional polish.
</fatal_constraints>

## 质量自检

- [ ] 前置门禁已通过（0.1–0.3）
- [ ] 布局原型已描述（文字/图/ASCII，不是代码）
- [ ] Must/Should/Could 标记已用在每段
- [ ] 组件拆解已列出（新组件 + 受影响已有组件）
- [ ] 无障碍需求已记录
- [ ] 状态与异常已记录（Loading / Empty / Error）
- [ ] 与 DESIGN.md 的差异已记录（或无差异声明）
- [ ] 没有写入实现代码
- [ ] 所有参考的设计 Token 来自项目已有配置

## 引擎门控（自动，无需手动确认）

- **states >= 3**: ui-design.json states 至少 loading/empty/error → 阻止。CLI-only 跳过
- **accessibility >= 1**: accessibility 至少 1 条 WCAG 合规项 → 阻止。CLI-only 跳过
