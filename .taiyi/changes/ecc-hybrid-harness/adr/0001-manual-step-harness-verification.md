# ADR-0001: 手工逐阶段推进验证双 harness

## Status

proposed

## Context

TaiyiForge v0.23+ 引入了 Hybrid manifest 双线 harness（Superpowers + ECC）。需要一次完整端到端走通验证以下假设：
1. `workflow-manifest.yaml` 的 harness 约束正确配置，每个阶段的钩子可触发、可打卡
2. `--auto` 模式下 harness-check 机制正常工作
3. 人工门禁阶段（change/design/review）的 `--approver` 参数正常拦截
4. integration 阶段的 delivery-gate（git trailer + clean worktree）正常工作

约束：8 个旧 change 卡在 integration 阶段无法复用；工作区 134 个文件 dirty 但非本次变更范围。

## Decision

采用方案 A：手工逐阶段调用 `taiyi continue` / `taiyi write`，每步留证据后 `harness-check` 打卡。不选方案 B（全自动 `taiyi loop`）因为 3 个 human gate 必然中途阻塞。

## Consequences

### Positive

- 每个阶段暴露出真实行为，包括 harness 钩子触发时机、quality gate 实际判据、human gate 拦截行为
- 发现问题可立即记录而不影响后续阶段
- 为未来 CI 自动化提供可执行的流程证据

### Negative

- 时间成本约 30 min 人工交互（9 个阶段 × ~3 min）
- 高度依赖当前环境状态（134 dirty files），不可在干净仓库复现

## Alternatives considered

| 方案 | 优点 | 缺点 | 为何未选 |
|------|------|------|----------|
| B 全自动 loop | 一次回车全自动，无人值守 | human gate 会卡住；出错需 undo | 验证目的决定必须逐阶段观察 |
| C 不做 | 零风险 | 双 harness 验证缺失 | 不满足验证需求 |

## Links

- DESIGN.md §Options, §Decision
- REQUIREMENT.md AC-01 through AC-06
- docs/taiyi/workflow-manifest.yaml
