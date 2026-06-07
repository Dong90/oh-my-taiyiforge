# Review 循环（/taiyi:review-loop）

**任意阶段可调用** — Agent 在同一会话内循环 review，直到**无 blocking 项**才停止（无需先推进到 review 阶段）。

## 斜杠命令

```text
/taiyi:review-loop [slug]     # 启动 review 循环（Agent 持续修+审直到通过）
/taiyi:review-check <slug>      # 单次机器探测（不计轮次）
```

Codex：`$taiyi-review-loop` · `$taiyi-review-check`

## 与单次检查的区别

| 命令 | 语义 |
|------|------|
| `/taiyi:review-check` | 只跑一次**循环门禁**（无 open high / 非 Request changes），适合快速探测 |
| `/taiyi:review-loop` | **会话循环**：审查不过 → 修代码 → 再 review → 再查，**直到通过才停** |

`review-loop` **不会**对旧 `REVIEW.md` 直接过关 — 每次先要求**新一轮** code review（基于 git diff），再由 `review-check` 跑机器门禁。

## Agent 循环协议

1. **taiyi-review** / gstack `review` → 写 `REVIEW.md`
2. `review-check` 探测机器门禁
3. 未通过 → 修代码 / `TEST.md` → 回到 1（**勿停下来等用户**）
4. 通过 → 提示用户 `complete review --approver`
5. 轮次记入 `.review-loop-state.json`（默认上限 `TAIYI_REVIEW_LOOP_MAX_ROUNDS=20`）

## 两档门禁（勿混淆）

| 命令 | 标准 |
|------|------|
| `review-check` / `review-loop` | 无 open high、非 Request changes、非 missing Verdict |
| `complete review` | 还须 `[x] **Approve**`；Findings 中 **high** 须标 `✅` / fixed / 已修复 / 豁免 |

## 与 /taiyi:loop 的区别

| 命令 | 阶段 | 行为 |
|------|------|------|
| `/taiyi:loop` | 任意非人工门 | 自动 `continue` 推进阶段 |
| `/taiyi:review-loop` | 仅 review | Agent 循环 review+修复，直到 REVIEW.md 过关 |

`complete review` 仍须 `--approver`（人工门）。
