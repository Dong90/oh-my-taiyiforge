# Token 压缩 · 第三方 Skill（与 Superpowers 铁三角同级）

TaiyiForge **引擎**负责零 LLM 截断；**Superpowers / gstack** 负责会话级隔离与落盘。均在 `--auto` 下为 **optional**，不阻塞 complete。

配置真源：[`token-compress-hooks.yaml`](./token-compress-hooks.yaml)

## 策略对照

| 层级 | 聊天命令 | 动作 | Token 成本 |
|------|----------|------|------------|
| **引擎** | `/taiyi:token compress` | `CONTEXT-COMPACT.md`（按 ## 节截断） | **0 LLM** |
| **Superpowers** | 加载 `subagent-driven-development` | 实现拆 subagent，主会话只协调 | subagent 用量，主窗大减 |
| **Superpowers** | 加载 `dispatching-parallel-agents` | 并行 slice 各用独立上下文 | 同上 |
| **gstack** | 加载 `checkpoint` | compaction / 换会话前落盘进度 | 一次 Skill 调用 |

## 阶段推荐

| 阶段 | 推荐 |
|------|------|
| change～design | `/taiyi:token compress`；长会话前 gstack checkpoint |
| task / dev | + Superpowers subagent / parallel |
| 任意 | `/taiyi:status` 超 85% 预算时读 **taiyi-compress** Skill |

## 聊天命令

```text
/taiyi:token status [slug]     # 超阈值时列出压缩策略 + harness-check 提示
/taiyi:token compress <slug>   # 引擎压缩 + 打印第三方下一步
/taiyi:token scan <slug>       # 压缩前扫描工件体量
/taiyi:token record <slug> <n> # 上报用量
```

Agent 代跑：`scripts/taiyi-forge.sh token <sub> …`（**勿让用户手打 npx**）

## harness 合并

`harness` 清单在对应阶段会自动附加 **optional** 行：

- `[shell] scripts/taiyi-forge.sh token compress <slug>`
- `[agent] superpowers/subagent-driven-development`
- `[agent] gstack/checkpoint`

打卡示例：

```bash
scripts/taiyi-forge.sh harness-check my-feature superpowers/subagent-driven-development
scripts/taiyi-forge.sh harness-check my-feature gstack/checkpoint
```

## 与 intel-scan 的关系

1. **taiyi-intel-scan** → `CONTEXT.md`（代码库情报）  
2. **`/taiyi:token compress`** → `CONTEXT-COMPACT.md`（全工件摘要）  
3. Agent 读 compact + 按需单文件，避免九份 Markdown 同时进窗

## OpenCode

加载 Skill **`taiyi-compress`**，或 `use skill tool to load superpowers/subagent-driven-development`。
