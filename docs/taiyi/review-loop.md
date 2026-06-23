# Review 循环 + 自动推进（/taiyi:review-loop · /taiyi:loop）

## 自动推进：/taiyi:loop · xN 后缀

```text
/taiyi:loop [slug] [xN]       # 循环 continue，直到完成或阻塞
/taiyi:continue [slug] [xN]   # 单轮内最多执行 N 次 continue
/taiyi:apply [slug] [xN]      # dev/test：重复输出 apply 清单 N 次
```

跨会话轮次记录在 `.taiyi/changes/<slug>/.loop-state.json`。

| 变量 | 默认 | 说明 |
|------|------|------|
| `TAIYI_LOOP_MAX` | 20 | 单次最多 continue 次数 |
| `TAIYI_LOOP_MAX_ROUNDS` | 50 | 跨会话轮次上限 |
| `TAIYI_REPEAT_MAX` | 100 | `xN` 后缀上限 |

---

## Review 循环：/taiyi:review-loop · /taiyi:review-check

**任意阶段可调用** — Agent 在同一会话内循环 review，直到**无 blocking 项**才停止。

```text
/taiyi:review-loop [slug]     # 启动 review 循环（Agent 持续修+审直到通过）
/taiyi:review-check <slug>      # 单次机器探测（不计轮次）
```

### 两档门禁

| 命令 | 标准 |
|------|------|
| `review-check` / `review-loop` | 无 open high、非 Request changes、非 missing Verdict |
| `complete review` | 还须 `[x] **Approve**`；high 须标 `✅` / fixed / 已修复 / 豁免 |

### Agent 循环协议

1. **taiyi-review** / gstack `review` → 写 `REVIEW.md`
2. `review-check` 探测机器门禁
3. 未通过 → 修代码 / `TEST.md` → 回到 1
4. 通过 → 提示用户 `complete review --approver`
5. 轮次记入 `.review-loop-state.json`（默认上限 20）

### 与 /taiyi:loop 的区别

| 命令 | 阶段 | 行为 |
|------|------|------|
| `/taiyi:loop` | 任意非人工门 | 自动 `continue` 推进阶段 |
| `/taiyi:review-loop` | 仅 review | Agent 循环 review+修复，直到通过 |
