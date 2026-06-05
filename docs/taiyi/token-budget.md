# Token 预算与上下文压缩

> 估算 Token（≈字符数/4）、按变更累计用量、阶段上限、费用估算、**引擎 + 第三方**压缩。

- 预算配置：[`token-budget.yaml`](./token-budget.yaml)  
- **第三方压缩（Superpowers / gstack）**：[`token-compress.md`](./token-compress.md) · [`token-compress-hooks.yaml`](./token-compress-hooks.yaml)  
- Agent Skill：**`taiyi-compress`**

## 聊天命令（用户只说斜杠；Agent 代跑 `taiyi-forge.sh token …`）

```text
/taiyi:token status [slug]              # 用量 / 预算；超阈值列出压缩策略
/taiyi:token record <slug> <n>          # Agent 上报本轮 Token
  [--phase change] [--kind agent|scan] [--label "描述"]
/taiyi:token scan <slug>                # 扫描工件 Markdown → 记入 scan
/taiyi:token compress <slug>            # 引擎 CONTEXT-COMPACT + 提示第三方 Skill
```

Codex：`$taiyi-token-status` · `$taiyi-token-record` · `$taiyi-token-scan` · `$taiyi-token-compress`

`/taiyi:status` 与 `guide` 输出含 **Token:** 行；超阈值时附「压缩策略」块。

## 压缩分层

| 顺序 | 方式 | 说明 |
|------|------|------|
| 1 | **`/taiyi:token compress`** | 无 LLM，生成 `CONTEXT-COMPACT.md` |
| 2 | **Superpowers** `subagent-driven-development` | 实现拆 subagent |
| 3 | **Superpowers** `dispatching-parallel-agents` | 并行 slice |
| 4 | **gstack** `checkpoint` | 换会话 / compaction 前落盘 |

## 环境变量

| 变量 | 作用 |
|------|------|
| `TAIYI_TOKEN_BUDGET` | 全局预算（默认 500000） |
| `TAIYI_TOKEN_ENFORCE=1` | 超预算时 **阻塞** `complete` |
| `TAIYI_TOKEN_COST_PER_M` | 每百万 Token 美元单价（默认 3） |
| `TAIYI_TOKEN_COMPRESS_THRESHOLD` | 超过则 status 建议 compress |
| `TAIYI_TOKEN_DISABLED=1` | 关闭追踪 |

## 阶段默认上限

见 `token-budget.yaml` 的 `phaseLimits`（如 change 80k、dev 150k）。

## Agent 约定

每轮对话结束：

```text
/taiyi:token record <slug> 8500 --phase design --label "plan-eng-review"
```

接近预算时加载 **`taiyi-compress`**，先 `/taiyi:token compress`，再按需 Superpowers / gstack。

## 存储

`.taiyi/changes/<slug>/.token-usage.json` — 不入库时可 gitignore。
