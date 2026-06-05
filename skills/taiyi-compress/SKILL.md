---
name: taiyi-compress
description: TaiyiForge 辅助 — Token 压缩编排：/taiyi:token compress + Superpowers subagent + gstack checkpoint。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-compress

## 目的

在 Token 接近预算或工件过大时，**分层压缩上下文**：先用引擎零 LLM 截断，再按需加载第三方 Skill 隔离/落盘会话。

## 何时使用

| 信号 | 动作 |
|------|------|
| `/taiyi:status` 出现 Token ⚠ 或压缩建议 | 读本 Skill |
| 工件 scan > `compressThreshold`（默认 120k） | 先 `/taiyi:token compress` |
| dev / 多 slice 并行 | Superpowers subagent / parallel |
| 长会话 / 换窗口 / compaction 前 | gstack checkpoint |

## 策略（与 Superpowers 铁三角同级）

### 1. 引擎（首选 · 零 LLM Token）

用户说 **`/taiyi:token compress <slug>`**；Agent 代跑：

```bash
scripts/taiyi-forge.sh token compress <slug>
```

产出 **`.taiyi/changes/<slug>/CONTEXT-COMPACT.md`**。后续阶段**优先读此文件**，再按需打开单工件。

### 2. Superpowers（聊天 Skill · optional）

| Skill | 用途 |
|-------|------|
| `subagent-driven-development` | 大实现拆 subagent，主会话只协调（省主窗 token） |
| `dispatching-parallel-agents` | 多 slice 并行，各 agent 不继承主会话历史 |

打卡（auto 模式 optional）：

```bash
scripts/taiyi-forge.sh harness-check <slug> superpowers/subagent-driven-development
```

### 3. gstack（聊天 Skill · optional）

| Skill | 用途 |
|-------|------|
| `checkpoint` | 落盘 git 状态 + 决策；新会话读 checkpoint 续作，对抗 IDE compaction |

```bash
scripts/taiyi-forge.sh harness-check <slug> gstack/checkpoint
```

## 推荐顺序

1. `/taiyi:token scan <slug>` — 了解工件体量  
2. `/taiyi:token compress <slug>` — 引擎摘要  
3. 若仍超预算 / 进入 dev：加载 **subagent-driven-development**  
4. 会话结束前：**gstack checkpoint**  
5. `/taiyi:token record <slug> <n> --phase <phase> --label "compress-flow"`

## 配置

- 预算：[`docs/taiyi/token-budget.yaml`](../../docs/taiyi/token-budget.yaml)  
- 压缩钩子：[`docs/taiyi/token-compress-hooks.yaml`](../../docs/taiyi/token-compress-hooks.yaml)

## 反模式

- 在已超阈值时仍全量读 CHANGE…CHANGELOG 进聊天  
- 跳过 CONTEXT-COMPACT 重复 grep 全库  
- 主会话直接实现多个 TASK slice（应 subagent）
