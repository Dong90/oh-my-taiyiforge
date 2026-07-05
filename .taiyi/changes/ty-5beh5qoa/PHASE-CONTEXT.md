# Change Graph: ty-5beh5qoa

## Phases
### requirement (12 nodes)
**acceptance_criterion** (3) Given 巡检脚本已就绪, When 巡检两个已完成 change 的九阶段工件, Then 输出包含各阶段评分... / Given 巡检报告已生成, When 查看报告内容, Then 每个阶段有 0-10 分且代码质量有独立评分 / Given 巡检报告已生成, When 检查两个 change 的横向对比, Then 有共性问题汇总和至少 3 ...
**unknown** (6)
  - 目标 change 目录不存在
  - 读取 .taiyi/changes/ 下目标 change 的全部九阶段工件
  - 按九个阶段维度逐项评分并计算加权总分
  - ... +3 more
**nfr** (3) 巡检过程零文件写入，写入操作数 = 0 / 巡检两个 change 总耗时 < 120 秒 / 无网络依赖，network requests ≤ 0 次

### design (6 nodes)
**threat** (1) 误修改目标 change 文件
**risk** (1) 纯只读巡检
**design_decision** (3) 文档评分 vs 代码评分比重 / 单审阅 vs 交叉审阅 / A
**unknown** (1) 巡检入口

### ui-design (1 nodes)
**design_decision** (1) 纯 CLI/文档审阅，无 UI 界面

### task (9 nodes)
**slice** (4)
  - 巡检 add-cli-help-command 九阶段工件
  - 巡检 ecc-hybrid-harness 九阶段工件
  - 交叉对比生成共性问题
  - ... +1 more
**risk** (2) 文件读取权限不足导致巡检中断 / 评分标准不一致导致偏倚
**rollback** (1) 删除生成的 REPORT.md 文件
**unknown** (2) Wave 1: 并行巡检 / Wave 2: 交叉对比与汇总

### test (6 nodes)
**test_case** (6)
  - REPORT.md 存在且包含 add-cli-help-command 评分
  - REPORT.md 包含 ecc-hybrid-harness 评分
  - 共性问题 >= 3 条已在报告中列出
  - ... +3 more

### review (9 nodes)
**unknown** (5)
  - TASK.md 模板生成的部分切片占位符未完全填充可见性不足
  - UI-DESIGN.md 的 CLI-only 声明可更简洁明了地表示不需要 UI 设计
  - 可读性
  - ... +2 more
**test_case** (4)
  - npm audit 通过
  - 无硬编码密钥
  - 纯只读巡检无安全风险
  - ... +1 more

### integration (1 nodes)
**unknown** (1) 待填写

## Cross-Cutting Concerns
**5** SSOT violations: 1 high, 1 medium, 3 low
- [LOW] design_decision (design vs task): design_decision 跨阶段不一致: "文档评分 vs 代码评分比重" ≠ "巡检 add-cli-help-command 九阶段工件"
- [LOW] design_decision (design vs task): design_decision 跨阶段不一致: "单审阅 vs 交叉审阅" ≠ "巡检 ecc-hybrid-harness 九阶段工件"
- [LOW] design_decision (design vs task): design_decision 跨阶段不一致: "A" ≠ "交叉对比生成共性问题"
- [HIGH] nfr (requirement vs design): nfr 跨阶段不一致: "巡检过程零文件写入，写入操作数 = 0" ≠ "误修改目标 change 文件"
- [MEDIUM] risk (task vs design): risk 跨阶段不一致: "文件读取权限不足导致巡检中断" ≠ "纯只读巡检"

## Stats
- Total nodes: 44
- Total edges: 31
- Phases with nodes: 7/8


## review (✓)
**评审**:
- [x] **Approve** — 可合并
---

**当前**: integration · Skill: @taiyi-integration · 工件: INTEGRATION.md
**复杂度**: low | Profile: full
**下一步**: 加载 @taiyi-integration，编辑 INTEGRATION.md

*引擎生成 · Agent 读此文件即可*

<!-- ⚠️ SSOT 声明: 以下摘要仅作快速参考。各阶段真源始终是对应的上游工件 (CHANGE.md / DESIGN.md / TASK.md 等)。
     版本发生变更或阶段有冲突时，请直接读取工件文件而非本摘要。 -->