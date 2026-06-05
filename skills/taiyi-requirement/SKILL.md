---
name: taiyi-requirement
description: TaiyiForge 第 2 阶段 — 需求与 Given/When/Then AC，产出 REQUIREMENT.md。
---

# taiyi-requirement

## 目的

把 CHANGE 里的成功标准拆成**用户故事 + 可测试验收标准（AC）**。

## 输入

- `CHANGE.md`（必须先存在）

## 输出

- `.taiyi/changes/<slug>/REQUIREMENT.md`
- 模板：`templates/REQUIREMENT.md`

## 执行步骤

1. 每条用户故事至少一组 **Given / When / Then**
2. Traceability 表：每个 AC 对应 CHANGE 的 Motivation 或 Success Criteria
3. 写清 **Out of Scope**（与 CHANGE 一致或更细）
4. 避免实现细节（接口名可出现在 AC 的 Then 里，但不说「用 Redis」除非 CHANGE 已约束）
5. 人工审批 + 质量五维通过后：`taiyi complete <slug> requirement`

## 禁止

- 无法对应到 CHANGE 的「顺便做一下」需求
