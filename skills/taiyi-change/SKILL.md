---
name: taiyi-change
description: TaiyiForge 第 1 阶段 — 变更提案，产出 CHANGE.md。四端通用。
---

# taiyi-change

## 目的

对齐**为什么做、做什么、不做什么、如何验收**，避免在对话里隐式改 scope。

## 何时使用

- 每个新 `slug` 的第一步（`taiyi init` 之后）
- `taiyi guide` 显示 `currentPhase: change`

## 输入

- 用户意图、Issue、产品 brief
- （建议）`taiyi-intel-scan` 产出的 `CONTEXT.md`

## 输出

- `.taiyi/changes/<slug>/CHANGE.md`（模板：`templates/CHANGE.md`）

## 执行步骤

1. `npx taiyi guide <slug>` — 查看 `recommendedAuxiliary`（通常含 `taiyi-intel-scan`）
2. 若有 `CONTEXT.md`，把 Scope 建议写入 CHANGE
3. 填满 **Motivation / Scope / Risks / Success Criteria**
4. Success Criteria 必须**可验证**（checkbox、测试、演示）
5. 选 **profile**（写在 Scope 旁注）：
   - `full` — 默认九阶段
   - `api` — 纯后端，init 时用 `--profile api`
   - `lite` — 小修复，`--profile lite`
6. 自检五维后：`npx taiyi complete <slug> change`（**人工门**：需审批者）

## Profile 提示

| 变更类型 | init 建议 |
|----------|-----------|
| 新功能全栈 | `--profile full` |
| API/CLI/库 | `--profile api` |
| 单行/小 bug | `--profile lite` |

## 质量自检

- [ ] Out of scope 明确
- [ ] 无未决风险藏在实现细节
- [ ] 与 CONTEXT 无矛盾

## 与铁三角

- Superpowers `brainstorming` — 立项前澄清（见 `guide.harness`）

## 禁止

- 跳过 CHANGE 直接写 REQUIREMENT 或代码
- 在 CHANGE 里写具体实现细节（留给 DESIGN/TASK）
