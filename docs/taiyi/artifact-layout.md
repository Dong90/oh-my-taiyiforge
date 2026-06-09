# 变更工件目录布局

> **何时读本文**：需要看清 `.taiyi/changes/<slug>/` 里有什么、各文件何时生成。实操仍走 [QUICKSTART.md](../QUICKSTART.md)。

## 树状图

```text
.taiyi/
├── changes/
│   └── <slug>/
│       ├── state.json              # 引擎真源（阶段、completedPhases、profile）
│       ├── CHANGE.md               # change 阶段
│       ├── REQUIREMENT.md          # requirement
│       ├── DESIGN.md               # design（lite profile 跳过）
│       ├── UI-DESIGN.md            # ui-design
│       ├── TASK.md                 # task
│       ├── TEST.md                 # test（证据：命令 + exit）
│       ├── REVIEW.md               # review
│       ├── CHANGELOG.md            # integration 切片
│       ├── CONTEXT.md              # 可选情报（mark-aux）
│       ├── CONTEXT-COMPACT.md      # token compress 产出
│       ├── HANDOFF.md              # handoff 暂停
│       └── .harness-checkpoints.json  # auto 模式铁三角打卡
├── archive/
│   └── YYYY-MM-DD-<slug>/          # archive 后移动（幂等 no-op）
└── forge-root                      # 可选：消费方指向引擎包路径
```

## 阶段 → 工件

见 [`phases.yaml`](./phases.yaml) · Profile **lite** 跳过 design / ui-design / task / review。

## Agent 读法

1. `status --json --compact` → `engineTruth`
2. 当前阶段单个 artifact md
3. 长会话优先 `CONTEXT-COMPACT.md`（`/taiyi:token compress` 后）

勿把全目录 md 一次性读进聊天。
