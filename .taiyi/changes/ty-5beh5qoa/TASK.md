---
phase: task
skill: taiyi-task
gate: auto
produces: TASK.md
upstream: [design, requirement]
downstream: [dev, test]
---
<!-- phase:task skill:taiyi-task gate:auto est:15min produces:TASK.md upstream:[design,requirement] downstream:[dev,test] cplx:[ALL]2steps +[M+]2 +[H]1 -->
# TASK: 巡检九阶段文档质量 — 任务拆解

> **总Slice**: 4 | **预估**: 0.5d | **并行**: 2

---

## Step 1: Dependency Graph
> **[ALL]** Goal: 一眼看清依赖 | Inputs: DESIGN.md
<!-- Action: Mermaid图，箭头=依赖 -->

```mermaid
flowchart LR
  SS1[巡检 add-cli-help-command 九阶段工件]
  SS2[巡检 ecc-hybrid-harness 九阶段工件]
  SS3[交叉对比生成共性问题]
  SS4[汇编评分报告含改进建议]
```

<!-- Validate: 无循环依赖 -->

---

## Slices

> **[ALL]** Goal: 每个Slice独立可交付 | Inputs: Step1+DESIGN.md §5
<!-- Action: 每个Slice=独立PR，含文件清单/验证命令/验收点/依赖/并行性/Completeness -->

### Slice S1: 巡检 add-cli-help-command 九阶段工件
> **[ALL]** | ⇧ 无 | ⇶ ✅可并行 | Score: [N]/10 — 评估基准: read_files√ + write_files√ + verify√ + checkpoints≥3 + rollback√ = 8/10+

读取 add-cli-help-command 的全部九阶段工件并逐阶段按维度评分

**read_files**（只读 · 不写）:
- `.taiyi/changes/add-cli-help-command/`

**write_files**（写边界 · 不越界）:
<!-- R7.3 强约束: 不碰禁动清单，不顺手改其他文件 -->
- （无 — 请填写 write_files 字段）


**验收点**:
- ⬜ 工件完整性检查
- ⬜ 评分维度覆盖

<!-- Validate: 可独立merge/deploy？文件范围精确？ -->

---

### Slice S2: 巡检 ecc-hybrid-harness 九阶段工件
> **[ALL]** | ⇧ 无 | ⇶ ✅可并行 | Score: [N]/10 — 评估基准: read_files√ + write_files√ + verify√ + checkpoints≥3 + rollback√ = 8/10+

读取 ecc-hybrid-harness 的全部九阶段工件并逐阶段按维度评分

**read_files**（只读 · 不写）:
- `.taiyi/changes/ecc-hybrid-harness/`

**write_files**（写边界 · 不越界）:
<!-- R7.3 强约束: 不碰禁动清单，不顺手改其他文件 -->
- （无 — 请填写 write_files 字段）


**验收点**:
- ⬜ 工件完整性检查
- ⬜ 评分维度覆盖

<!-- Validate: 可独立merge/deploy？文件范围精确？ -->

---

### Slice S3: 交叉对比生成共性问题
> **[ALL]** | ⇧ Slice S1,S2 | ⇶ ❌须顺序 | Score: [N]/10 — 评估基准: read_files√ + write_files√ + verify√ + checkpoints≥3 + rollback√ = 8/10+

交叉对比 S1 和 S2 的逐阶段评分，识别重复出现的模板填写和代码质量问题

**read_files**（只读 · 不写）:
- `S1 output`
- `S2 output`

**write_files**（写边界 · 不越界）:
<!-- R7.3 强约束: 不碰禁动清单，不顺手改其他文件 -->
- （无 — 请填写 write_files 字段）


**验收点**:
- ⬜ 共性问题 >= 3 条

<!-- Validate: 可独立merge/deploy？文件范围精确？ -->

---

### Slice S4: 汇编评分报告含改进建议
> **[ALL]** | ⇧ Slice S3 | ⇶ ❌须顺序 | Score: [N]/10 — 评估基准: read_files√ + write_files√ + verify√ + checkpoints≥3 + rollback√ = 8/10+

将 S1 S2 S3 的结果汇编为 REPORT.md，含两维度评分和至少 3 条改进建议

**read_files**（只读 · 不写）:
- （无 — 请填写 read_files 字段）

**write_files**（写边界 · 不越界）:
<!-- R7.3 强约束: 不碰禁动清单，不顺手改其他文件 -->
- `.taiyi/changes/ty-5beh5qoa/REPORT.md`


**验收点**:
- ⬜ REPORT.md 非空
- ⬜ 评分覆盖全部 9 阶段

<!-- Validate: 可独立merge/deploy？文件范围精确？ -->

---


## Checklist per slice

- [ ] 测试先行（RED）— 每个 Slice 先写失败测试
- [ ] 最小实现（GREEN）— 让测试通过
- [ ] 重构（REFACTOR）— 不改变行为
- [ ] Done when includes npm test command
- [ ] 更新追溯（REQUIREMENT AC ↦ 测试用例）


## Step 3: Execution Plan
> **[MEDIUM+]** Goal: 分Wave并行执行 | Inputs: Step2
<!-- Action: 按依赖图分组，无依赖的同Wave并行 -->

### Wave Wave 1: 并行巡检
- S1: 巡检 add-cli-help-command 全部九阶段工件
- S2: 巡检 ecc-hybrid-harness 全部九阶段工件
### Wave Wave 2: 交叉对比与汇总
- S3: 交叉对比两个 change 评分生成共性问题
- S4: 汇编最终评分报告含改进建议

<!-- Validate: 每Wave内部确实无依赖？ -->

## Step 4: Risk per Slice
> **[MEDIUM+]** Goal: 每个Slice风险独立评估 | Inputs: Step2+DESIGN.md §6
<!-- Action: Slice→风险→概率→缓解 -->

| Slice | 风险 | 概率 | 缓解 |
|-------|------|------|------|
| S1 | 文件读取权限不足导致巡检中断 | low | 检查文件存在性后再读取并标记缺失 |
| S2 | 评分标准不一致导致偏倚 | medium | 使用统一评分维度和 0-10 量表 |

<!-- Validate: 高风险Slice有独立回滚？ -->

## Step 5: Rollback per Slice
> **[HIGH]** Goal: 每个Slice可独立安全回退 | Inputs: Step4
<!-- Action: 回滚方式+预计时间+数据影响 -->

| Slice | 回滚方式 | 时间 | 数据影响 |
|-------|---------|------|---------|
| S4 | 删除生成的 REPORT.md 文件 | 1 min | 无 |

<!-- Validate: 每个Slice可独立回滚？数据一致性？ -->

> 📎 **SSOT 规则**: 切片风险基于 [DESIGN.md §Blast Radius](DESIGN.md) 细分，不回重新评估。切片回滚基于 [CHANGE.md](CHANGE.md) 的 rollback_{trigger,ops,time} 做切片级适配（≤5min/md-only）。
>
> 📎 **多 Slice 并行模式**: 若变更拆为多个可并行发版的 Slice（对应独立 PR），每个 Slice 可生成独立的 `TEST-{slice}.md` 和 `REVIEW-{slice}.md`（ultrawork 模式）。宏观的 TEST.md / REVIEW.md 仅作为阶段级摘要；CI 流式合并以 Slice 级 TEST / REVIEW 为门控单元。

---
## Quality Gate
<!-- Evidence-first: 每个Slice可独立验证交付。cognitive#13: 先重构再实现，不把结构+行为放同一个PR -->

- [ ] S1 依赖图无循环
- [ ] S2 每个Slice可独立交付
- [ ] S2 每个Slice有 read_files/write_files + 验证 + 验收点
- [ ] S2 每个Slice有Completeness评分
- [ ] [M+] S3 Wave分波合理
- [ ] [M+] S4 每Slice风险已评估
- [ ] [H]  S5 每Slice有独立回滚
- [ ] **PITFALLS.md**: 已扫描触达模块的 PITFALLS（`.pitfalls/scan.sh --module <path>` + 人工 grep 关键词），无已知踩坑或已声明规避方案
- [ ] **项目上下文**: 已查 PHASE-CONTEXT.md 既有抽象索引，无重复实现
- [ ] **Refactor-first**: 重构PR和功能PR分开了？(Rule: make change easy, then make easy change)
