# Change Graph: add-cli-help-command

## Phases
### change (6 nodes)
**risk** (1) help 文本与代码不同步
**acceptance_criterion** (2) 执行 help 输出所有可用命令 / 帮助文本包含每个命令的一句话说明
**unknown** (2) packages/cli/src/commands/help.ts / packages/cli/src/index.ts
**rollback** (1) help 输出覆盖标准错误流

### requirement (11 nodes)
**acceptance_criterion** (2) Given 无参数, When 执行 help, Then 输出命令清单 / Given 任何命令, When 执行 help, Then 显示该命令详细帮助
**unknown** (6)
  - 命令名不存在
  - 列出所有已注册 commander 命令
  - 格式化输出含命令名和描述
  - ... +3 more
**nfr** (3) 无新增攻击面 / help 命令响应 < 50ms / CI 兼容

### design (9 nodes)
**threat** (1) 信息泄露
**risk** (1) 使用 commander built-in help
**design_decision** (2) built-in vs 手写 / A
**unknown** (2) help.ts / index.ts
**deployment_step** (2) npm run build / npm link 本地测试
**rollback** (1) help 命令输出不符合预期

### ui-design (1 nodes)
**design_decision** (1) CLI only — 无视觉变更

### task (8 nodes)
**slice** (2) help command / register in index
**risk** (2) commander version mismatch / 命令名冲突
**rollback** (2) git revert HEAD / git revert HEAD
**unknown** (2) Wave 1 / Wave 2

### test (4 nodes)
**test_case** (4)
  - 无参数 help 输出所有命令
  - help <name> 输出单命令详情
  - help 不存在的命令名
  - ... +1 more

### review (6 nodes)
**unknown** (6)
  - help 输出可加颜色区分命令和描述
  - functional
  - architecture
  - ... +3 more

### integration (1 nodes)
**unknown** (1) 待填写

## Cross-Cutting Concerns
**7** SSOT violations: 3 high, 2 medium, 2 low
- [MEDIUM] risk (change vs requirement): risk 跨阶段不一致: "help 文本与代码不同步" ≠ "无新增攻击面"
- [HIGH] rollback (change vs design): rollback 跨阶段不一致: "help 输出覆盖标准错误流" ≠ "help 命令输出不符合预期"
- [LOW] design_decision (design vs task): design_decision 跨阶段不一致: "built-in vs 手写" ≠ "help command"
- [LOW] design_decision (design vs task): design_decision 跨阶段不一致: "A" ≠ "register in index"
- [HIGH] nfr (requirement vs design): nfr 跨阶段不一致: "无新增攻击面" ≠ "信息泄露"
- [MEDIUM] risk (task vs design): risk 跨阶段不一致: "commander version mismatch" ≠ "使用 commander built-in help"
- [HIGH] rollback (task vs design): rollback 跨阶段不一致: "git revert HEAD" ≠ "help 命令输出不符合预期"

## Stats
- Total nodes: 46
- Total edges: 21
- Phases with nodes: 8/8


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