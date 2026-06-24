---
name: taiyi-reanalyze
description: TaiyiForge 辅助 — 重新理解已有需求工件，找出矛盾、缺口、歧义。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-reanalyze

## 目的

当需求文档写了一段时间后，团队对需求的理解可能已经变化。这个技能重新阅读 CHANGE.md 和 REQUIREMENT.md，找出其中的矛盾、缺口和模糊点，产出一份「二次理解」报告。

## 何时使用

reanalyze 跑在 requirement 写完之后、dev 开始之前：

```
change → requirement → /taiyi:sp reanalyze（重新理解）
                │               │
                ▼               ▼ 产出 REANALYZE.md
              design → ui-design → task → dev → ...
                              │
              缺口/歧义 → 回到 requirement 补 AC
```

| 信号 | 建议 |
|------|------|
| change 写完后放了一周以上才开始 dev | 必跑 |
| 多人协作，中间有人改过 scope | 必跑 |
| requirement 写到一半觉得不对劲 | 必跑 |
| review 阶段发现设计和需求对不上 | 必跑 |
| 刚写完 change，记忆还新鲜 | 跳过 |

## 输入

- `.taiyi/changes/<slug>/CHANGE.md`
- `.taiyi/changes/<slug>/REQUIREMENT.md`
- （可选）`CONTEXT.md` 代码情报
- （可选）上游 README/PRD

## 输出

一份重新分析报告，写到 `.taiyi/changes/<slug>/REANALYZE.md` 或直接在聊天里展示。

格式：
```markdown
# Reanalyze: <slug>

> 重分析日期 · 原始 change 日期 · 间隔 X 天

## 重新理解

用一句话重述这个 change 要解决什么问题。

## 一致性检查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| CHANGE 和 REQUIREMENT 的范围一致 | ✅ | |
| AC 覆盖了所有 scope 条目 | ❌ | 缺少「权限校验」的 AC |
| 设计方案的假设在代码情报中成立 | ⚠️ | CONTEXT 标记了风险区 |
| 没有自相矛盾的 AC | ✅ | |

## 缺口

列出 REQUIREMENT 中应该覆盖但没覆盖的内容：
1. **缺口 1**：XXX 场景没有 AC
2. **缺口 2**：未定义错误处理策略

## 歧义

列出表述不清、有多种理解的内容：
1. **歧义 1**：「支持多种登录方式」—— 具体哪几种？oauth 还是手机号？
2. **歧义 2**：「高性能」—— 量化标准是什么？

## 建议

- 补充 AC：「XXX」
- 向产品确认：「YYY」
- 缩小 scope：「ZZZ 放到下一期」
```

## 执行步骤

### 1. 重新阅读

把 CHANGE.md 和 REQUIREMENT.md 当成第一次读：
- 用一句话概括这个 change 的**核心问题**
- 列出你理解中的**关键约束**（时间、依赖、不可碰的部分）

### 2. 交叉校验

| 核对 | 方法 |
|------|------|
| CHANGE vs REQUIREMENT | 每个 scope 条目在 REQUIREMENT 中有对应的 AC 吗？ |
| AC 完整性 | happy path / error path / edge case 都覆盖了吗？ |
| 假设 vs 现实 | CONTEXT.md 中的代码现实是否推翻了设计假设？ |
| 自洽性 | AC 之间有没有互相矛盾的？ |

### 3. 找缺口

重点关注：
- 错误处理：每个 AC 的失败场景定义了吗？
- 非功能需求：性能、安全、可观测性？
- 边界条件：空输入、超大数据、并发？

### 4. 找歧义

- 模糊词：「支持」「优化」「完善」→ 要求具体化
- 未定义术语：「用户」「订单」→ 确认定义
- 隐含假设：「登录后才能用」→ 显式写出来

### 5. 产出建议

- 需要补充的 AC
- 需要向上游确认的问题
- 建议缩小 scope 的部分

### 6. 自动修复（报告展示后询问）

报告展示完后，**必须询问**：

> 要自动修复发现的问题吗？
> - **自动修**：我直接更新 CHANGE.md / REQUIREMENT.md 中的缺口和歧义
> - **手动修**：你自己对着报告改，我把 REANALYZE.md 保存下来
> - **不修**：只看报告不做改动

## 与其他阶段的衔接

- 如果发现范围漂移 → 更新 `CHANGE.md` 的 Scope 部分
- 如果发现 AC 缺口 → 追加到 `REQUIREMENT.md`
- 如果发现设计假设不成立 → 触发 `taiyi-design` 重新设计

## 质量自检

- [ ] 每个缺口有具体的补救建议
- [ ] 每个歧义有明确的确认问题
- [ ] 一致性检查覆盖了 CHANGE·REQUIREMENT·CONTEXT 三份文档
- [ ] 建议是可执行的（不是「再想想」）

## 禁止

- 在重分析阶段直接改业务代码
- 把「我觉得」当证据
- 跳过 CHANGE.md 直接看 REQUIREMENT.md（会丢失上下文）
