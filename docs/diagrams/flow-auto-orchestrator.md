# flow-auto-orchestrator：全自动模式

> 上级索引：[flows.md](./flows.md)  
> 触发：`init --auto` · `new --auto` · `TAIYI_AUTO_HARNESS=1`

```mermaid
flowchart TD
  start([init/new --auto]) --> orch[加载 taiyi-orchestrator]
  orch --> loop{currentPhase 未完成?}

  loop -->|是| harness[harness 清单顺序]
  harness --> tri[铁三角 Skill/工具]
  tri --> aux[辅助 Skill + mark-aux]
  aux --> main[主阶段 taiyi-* 写工件]
  main --> cont{continue 可过?}

  cont -->|否| pause[handoff / 等人审批]
  cont -->|是| loop
  pause -->|approver / 修复| loop

  loop -->|九阶段完成| audit[/taiyi:audit]
  audit --> land{delivery 闭环?}
  land -->|是| done([integration + archive])
  land -->|否| fix[补 TEST/REVIEW/git]
  fix --> loop

  classDef gate fill:#fef3c7,stroke:#ca8a04
  class cont,land gate
```

与手动模式差异：每阶段 **须** harness-check；change/design/review 仍 **不能** 跳过人工 approver（OMO）。

代码参考：`skills/taiyi-orchestrator/SKILL.md` · `src/core/harness-runner.ts` · `src/core/autopilot-runner.ts`
