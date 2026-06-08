# oh-my-taiyiforge 流程图

> **组件/模块架构**（谁依赖谁）→ [`architecture.md`](./architecture.md) · **产品海报** → [`../taiyiforge-architecture.png`](../taiyiforge-architecture.png)  
> 导出 PNG：`node scripts/render-mermaid.mjs docs/diagrams/flows.md`

更新：2026-06-08 · 真源：`docs/taiyi/workflow-manifest.yaml`

---

## 1. 开发者主路径（从立项到归档）

```mermaid
flowchart TD
  start([开始]) --> install{npx taiyi-forge-install?}
  install -->|否| instFail[安装四端 Skills + 脚本]
  install -->|是| new
  instFail --> new

  new["/taiyi:new 标题"] --> change["阶段1 change<br/>taiyi-change → CHANGE.md"]
  change --> hg1{人工门?}
  hg1 -->|change complete + approver| req["阶段2 requirement"]
  hg1 -->|拦截| fixC[补 CHANGE / explore]

  req --> des["阶段3 design"]
  des --> hg2{人工门?}
  hg2 -->|approver| ui["阶段4 ui-design"]
  hg2 -->|拦截| fixD[补 DESIGN / diagram]

  ui --> task["阶段5 task"]
  task --> dev["阶段6 dev<br/>TDD + .dev-complete"]
  dev --> test["阶段7 test"]
  test --> rev["阶段8 review"]
  rev --> hg3{人工门?}
  hg3 -->|approver| int["阶段9 integration"]
  hg3 -->|拦截| fixR[改代码 / health]

  int --> dg{delivery-gate}
  dg -->|通过| arch["/taiyi:archive"]
  dg -->|失败| fixI[audit · git 干净 · AC]
  arch --> end([变更闭环])

  fixC --> change
  fixD --> des
  fixR --> dev
  fixI --> int

  classDef gate fill:#fef3c7,stroke:#ca8a04,color:#422006
  class hg1,hg2,hg3,dg,install gate
```

Profile 分支（未展开）：`api` 跳过 ui-design · `lite` 跳过 design / ui-design / task / review。

---

## 2. 九阶段 + Skill + 工件（full profile）

```mermaid
flowchart LR
  subgraph p1["1 change"]
    c1[taiyi-change] --> a1[CHANGE.md]
  end
  subgraph p2["2 requirement"]
    c2[taiyi-requirement] --> a2[REQUIREMENT.md]
  end
  subgraph p3["3 design"]
    c3[taiyi-design] --> a3[DESIGN.md]
  end
  subgraph p4["4 ui-design"]
    c4[taiyi-ui-design] --> a4[UI-DESIGN.md]
  end
  subgraph p5["5 task"]
    c5[taiyi-task] --> a5[TASK.md]
  end
  subgraph p6["6 dev"]
    c6[taiyi-dev] --> a6[代码+测试]
  end
  subgraph p7["7 test"]
    c7[taiyi-test] --> a7[TEST.md]
  end
  subgraph p8["8 review"]
    c8[taiyi-review] --> a8[REVIEW.md]
  end
  subgraph p9["9 integration"]
    c9[taiyi-integration] --> a9[CHANGELOG.md]
  end

  p1 --> p2 --> p3 --> p4 --> p5 --> p6 --> p7 --> p8 --> p9
```

辅助工件（按需，不阻塞主线）：`CONTEXT.md` · `adr/` · `diagrams/` · `health-report.md` · `architecture-sync.md`

---

## 3. 变更状态机（state.json）

```mermaid
stateDiagram-v2
  [*] --> change: init / new
  change --> requirement: complete ✓
  requirement --> design: complete ✓
  design --> ui_design: complete ✓ + 人工
  ui_design --> task: complete ✓
  task --> dev: complete ✓
  dev --> test: complete ✓ + .dev-complete
  test --> review: complete ✓
  review --> integration: complete ✓ + 人工
  integration --> archived: archive / 闭环
  archived --> [*]

  change --> aborted: cancel
  requirement --> aborted: cancel
  design --> aborted: cancel
  note right of change
    currentPhase 由
    workflow-engine 维护
  end note
```

---

## 4. 双轨执行（聊天 vs 引擎）

```mermaid
flowchart LR
  subgraph chatTrack["聊天轨 · Agent"]
    U[用户 /taiyi:*] --> A[Agent]
    A --> SK[加载 taiyi-* Skill]
    SK --> W[写 md / 写代码 / 跑测试]
  end

  subgraph engineTrack["引擎轨 · 不可手打 npx"]
    A --> SH[scripts/taiyi-forge.sh]
    SH --> CLI[taiyi CLI]
    CLI --> WE[WorkflowEngine]
    WE --> G[门禁 + harness]
    G --> ST[state.json 推进]
  end

  W -.工件.-> G
  ST --> A
```

---

## 5. 子流程索引

| 流程 | 文件 | 说明 |
|------|------|------|
| `/taiyi:continue` 门禁决策树 | [flow-continue-gates.md](./flow-continue-gates.md) | 含失败分支 |
| `--auto` 全自动编排 | [flow-auto-orchestrator.md](./flow-auto-orchestrator.md) | orchestrator + harness |

---

## 6. Traceability（本仓库文档）

| 流程节点 | 文档 / 代码 |
|----------|-------------|
| 九阶段顺序 | `docs/taiyi/workflow-manifest.yaml` |
| 斜杠命令 | `docs/taiyi/commands.yaml` |
| 人工门 | `src/core/gates/human-gate-config.ts` |
| 质量五维 | `docs/taiyi/quality-gate.yaml` |
| delivery-gate | `src/core/gates/delivery-gate.ts` |
| continue 实现 | `src/core/workflow-engine.ts` |
| 验证套件 | `examples/verification-suite/run-all.mjs` |

---

## 7. 与架构流水线 / diagram-arch 的分工

| 命令 | 产出 | 回答的问题 |
|------|------|------------|
| `/taiyi:diagram-pipeline` | `c4/` + `architecture.md` + `png/` | **一条链**：C4 真源 → 工程图 → PNG |
| `/taiyi:diagram-c4` | `c4/containers.md` | 代码反推模块边界（Observed/Inferred） |
| `/taiyi:diagram-arch` | `architecture.md` | **模块**有哪些、怎么连（同步自 c4） |
| `/taiyi:diagram-render` | `c4/png/*.svg` | C4 Mermaid → SVG |
| `/taiyi:diagram-flow` | `flows.md`（本文） | **步骤**怎么走、何时被门禁拦住 |

详见 [`pipeline.md`](pipeline.md)。产品海报：`docs/taiyiforge-architecture.png`。
