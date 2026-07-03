# CHANGE: ECC Hybrid 双 harness 走通

## Motivation

**谁痛**: TaiyiForge 开发者和维护者。workflow-manifest.yaml 已将 Superpowers + ECC 双线 harness 写入规范，但从未在真实 change 上跑通过。旧有 8 个 change 全部卡在 integration 阶段，无法验证双 harness 的实际行为能力。

**现状代价**:
- 双 harness 配了但无实测证据 → 文档漂移，新贡献者无法确认这套流程到底能不能跑
- old changes 缺少 git trailer 无法 delivery → 死锁 8 个变更，工作流信心受损
- ECC 已全局安装但零运行记录 → 花了安装成本但没见到 ROI

**改善指标**:
- 完整走完一个 full-profile 的九阶段流程（change → requirement → design → task → dev → test → review → integration）
- 每个阶段的 ECC harness 钩子实际触发并通过
- integration 阶段 delivery-gate 输出 git trailer 证据

## Scope

**In**:
- 创建新 change `ecc-hybrid-harness` 并完整走通九阶段
- 在每个阶段触发对应 ECC harness 钩子，记录打卡证据
- integration 阶段完成 delivery-gate（含 git trailer）

**Out**:
- 不修复旧有 8 个 change（已被放弃）
- 不修改引擎代码或 workflow-manifest.yaml 配置
- 不涉及任何业务代码改动（纯流程验证）
- 不含前端 UI（profile full 但 ui-design 阶段跳过或 N/A）

## Risks

- ECC harness 钩子可能实际调用失败（`classifyHook()` 返回 `agent` 但 agent dispatch 可能缺技能文件）
- integration 阶段 delivery-gate 要求 git commit 带 `Taiyi-Change` trailer — 只有 dev 阶段有真实 commit 时才能验证
- 本项目是 TaiyiForge 自身（TypeScript monorepo），dev 阶段的 TDD 需修 bug/add test，可能暴露其他问题

## Success Criteria

- [x] change 阶段 complete 成功（human gate: `--approver dongjun`）
- [x] requirement 阶段产出 REQUIREMENT.md 且无 seed 残留
- [x] design 阶段产出 DESIGN.md（≥2 方案对比）
- [x] task 阶段产出 TASK.md（可执行任务切片）
- [x] dev 阶段 TDD 红绿循环完成，`.dev-complete` 有 exitCode 0
- [x] test 阶段 TEST.md 包含测试覆盖摘要
- [x] review 阶段 REVIEW.md 通过（human gate: `--approver dongjun`）
- [ ] integration 阶段 delivery-gate 完成，CHANGELOG.md 产出
- [ ] 最终 `engineTruth.displayPhase === "integration"` 且 `engineTruth.currentPhase === null`
