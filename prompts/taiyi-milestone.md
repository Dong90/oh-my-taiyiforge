---
canonical: v28
umbrella: milestone
kind: daily
chat: /taiyi:milestone
codex: $taiyi-milestone
engine: taiyi-forge.sh milestone
since: v0.27.0
---

# /taiyi:milestone — 里程碑总览

项目级全局进度看板，聚合所有 `.taiyi/changes/` 下变更：

- 总变更数、活跃数、完成数、废弃数
- 整体完成率（进度条）
- 各阶段分布（瓶颈标注）
- 变更清单（含下一步命令、陈旧标记）

## 用法

```
/taiyi:milestone            # 仅活跃变更
/taiyi:milestone --all      # 含已完成和废弃
```

等价 CLI: `npx taiyi milestone [--all]`

## 字段

- `totalChanges`: 总变更数
- `activeChanges`: 活跃变更
- `completionPercent`: 整体完成率（百分比）
- `phaseDistribution`: 各阶段变更分布
- `bottleneckPhase`: 卡住最多的阶段
- `changes[]`: 每个变更的详细行 { slug, title, currentPhase, progress, days, next }

## 下一步

根据输出「优先处理」行的命令，恢复最该推进的变更。
