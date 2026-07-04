---
name: taiyi-architect
description: TaiyiForge 辅助 — 架构决策记录 ADR（长期影响决策的可追溯补充）。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-architect

## 目的

把**长期难逆**的技术决策从 `DESIGN.md` 抽成独立 ADR，供未来变更、onboarding 和 review 追溯——不替代 `taiyi-design`，而是补充「为什么当时这样选」。

## 何时使用

| 决策类型 | 示例 | 建议 |
|----------|------|------|
| 数据与存储 | 新表、迁移策略、缓存层 | ADR |
| 安全与信任 | 鉴权模型、多租户隔离 | ADR |
| 集成边界 | 新微服务、第三方 SDK、事件总线 | ADR |
| 跨团队契约 | 公共 API、共享库破坏性变更 | ADR |
| 局部重构 | 重命名、抽函数 | 否，留在 DESIGN / TASK |

触发信号：

- `taiyi_assess` 推荐 `taiyi-architect`
- `taiyi-design` Options 里多个方案 **Cost 差 ≥ 2x** 或 **运维负担显著不同**
- dev 中发现原方案不可行，需**正式废弃**旧决策

## 输入

- `CHANGE.md`、`REQUIREMENT.md`、`DESIGN.md`
- （可选）`CONTEXT.md`、`taiyi-intel-scan` 风险区
- 工程评审结论

## 输出

- 路径：`.taiyi/changes/<slug>/adr/NNNN-<short-title>.md`
- 编号：`0001` 起递增，**全仓库统一**或**每 slug 独立**二选一（在首个 ADR 文首声明规则）
- `DESIGN.md` 的 **Decision** 节须回链：`ADR-0003` + 一句话摘要

## ADR 结构（必填）

```markdown
# ADR-NNNN: <标题>

## Status

proposed | accepted | deprecated | superseded by ADR-XXXX

## Context

<!-- 压力、约束、相关 AC / 风险 -->

## Decision

<!-- 我们决定 … -->

## Consequences

### Positive

- …

### Negative

- …

## Alternatives considered

| 方案 | 优点 | 缺点 | 为何未选 |
|------|------|------|----------|
| A | | | |
| B | | | |

## Links

- DESIGN.md §…
- REQUIREMENT.md AC-…
```

## 执行步骤

1. **确认决策边界**：一句话写清「本 ADR 解决什么 / 不解决什么」
2. **收集约束**：性能、合规、团队技能、上线窗口——来自 REQUIREMENT / CHANGE
3. **列 ≥2 个真备选**：含「维持现状」若合理；禁止 strawman
4. **写 Decision**：可执行、可验证（例如「用 PostgreSQL JSONB 存元数据，不用 Mongo」）
5. **写 Consequences**：诚实写负向（运维、迁移、锁定）
6. **定 Status**：设计阶段多为 `proposed`；人工确认后改 `accepted`
7. **回写 DESIGN.md**：Decision 表增加 ADR 链接；Open Questions 关闭对应项
8. 若 supersede 旧 ADR：旧文 Status → `superseded`，新 ADR 的 Links 互指

## 与主流程关系

```
taiyi-change → taiyi-requirement → taiyi-design
                      ↓                    ↓
              taiyi-intel-scan      taiyi-architect (按需)
                      ↓                    ↓
                              DESIGN.md + adr/
```

- **ui-design / task / dev** 不得违背 `accepted` ADR；若必须违背，先新 ADR 或走变更提案
- 集成阶段 `CHANGELOG.md` 可引用 ADR 编号说明破坏性变更

## 质量自检

- [ ] 无 ADR 的「唯一方案」已在 Alternatives 说明为何别无选择
- [ ] Negative consequences 至少 2 条
- [ ] 每条 Decision 可在代码或配置中找到**对应落点**（表名、包名、接口路径）
- [ ] Status 与 DESIGN Open Questions 一致

## 与双线 harness

- 评审结论中「必须记录」项 → 升格为 ADR
- **OpenSpec**：若已 `sync-openspec`，ADR 摘要可同步到 `design.md` 脚注（非自动，人工摘一句）

## 禁止

- 用 ADR 堆细节实现（属 TASK / 代码注释）
- Status `accepted` 但未回写 DESIGN
- 一 ADR 多决策（拆成多个编号）
- 在 dev 静默改架构不留 ADR（改走 `taiyi-evolve` + 新 ADR）
