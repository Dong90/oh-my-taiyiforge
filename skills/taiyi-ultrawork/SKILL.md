---
name: taiyi-ultrawork
description: TaiyiForge ultrawork — 并行切片 + Cursor Task 自动派发契约（对标 OMC ultrawork + spawn_agent）
---

# taiyi-ultrawork

加载时机：`/taiyi:ultrawork` · 关键词 `ulw` · `scripts/taiyi-forge.sh ultrawork` · ultrawork step 输出。

## 强制契约（TAIYI_ULW_AUTO_TASK=1 或 step 标明 AUTO）

1. 主会话 **禁止** 亲自实现全部 TASK 切片。
2. 对 `step` 输出的每个 worker **并行** 调用 Cursor `Task` 工具（或 Claude subagent）。
3. 每个 worker prompt 须含：`/taiyi:agent <role>` · 切片任务 · `/taiyi:sp test-driven-development` · 完成标准 ralph 绿。
4. **文件所有权清单**：每个 worker prompt 必须附带其 write_files 清单 + 锁定表，标明：
   - 该 worker **拥有** 的文件（独占写权限）
   - 该 worker **不可触碰** 的文件（属其他 worker）
   - 违反此规定 → 合并冲突，worker 需 rebase 重试
5. 全部 worker 返回后：主会话合并冲突（如有）→ `scripts/taiyi-forge.sh ralph` → `/taiyi:continue`。
6. 停止：`/taiyi:stop-mode`。

## 辅助 Skill

- `/taiyi:sp dispatching-parallel-agents`
- `/taiyi:sp subagent-driven-development`

## 引擎

```bash
scripts/taiyi-forge.sh step [slug] --mode ultrawork
```

环境变量：

| 变量 | 说明 |
|------|------|
| `TAIYI_ULW_TASK=0` | 不打印 Task 示例 |
| `TAIYI_ULW_AUTO_TASK=1` | step 输出强制 AUTO 派发契约 |
