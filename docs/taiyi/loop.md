# 循环推进（/taiyi:loop · xN 后缀）

在用户只说斜杠、Agent 代跑引擎的前提下，支持 **单轮多次 continue** 与 **跨会话循环直到功能完成**。

## 聊天命令

```text
/taiyi:loop [slug] [xN]       # 循环 continue，直到完成或阻塞（默认每轮最多 20 次）
/taiyi:continue [slug] [xN]   # 单轮内最多执行 N 次 continue
/taiyi:apply [slug] [xN]      # dev/test：重复输出 apply 清单 N 次
/taiyi:check [slug] [xN]      # 重复输出 harness 清单 N 次
```

次数写法：`x5`、`×5`、`--times 5`、`-n 5`（可放在 slug 后面）。

Codex：`$taiyi-loop`

## Agent 循环协议（直到功能完成）

1. **`/taiyi:loop`** — 引擎能自动过的阶段连续过关  
2. **阻塞时** — 加载当前阶段 Skill 写工件，或 dev/test 用 **`/taiyi:apply`** 实现  
3. **auto 模式** — 铁三角 `harness-check` 后再次 **`/taiyi:loop`**  
4. **九阶段完成** → **`/taiyi:archive`**

跨会话轮次记录在 `.taiyi/changes/<slug>/.loop-state.json`（`round` / `maxRounds`）。

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `TAIYI_LOOP_MAX` | 20 | 单次 `/taiyi:loop` 最多 continue 次数 |
| `TAIYI_LOOP_MAX_ROUNDS` | 50 | 跨会话循环轮次上限 |
| `TAIYI_REPEAT_MAX` | 100 | `xN` 后缀上限 |

## 示例

```text
/taiyi:loop my-feature          # 尽量连过多个就绪阶段
/taiyi:continue x3              # 最多连试 3 次 continue
/taiyi:apply x2                 # 两轮 apply 清单（实现迭代）
```

引擎（Agent 内部）：

```bash
scripts/taiyi-forge.sh loop my-feature x10
scripts/taiyi-forge.sh continue my-feature x3
```

## 与 Superpowers 的关系

大实现阶段可配合 **`subagent-driven-development`**：主会话反复 `/taiyi:loop`，subagent 负责单个 slice 实现。
