---
name: taiyi-evolve
description: TaiyiForge 辅助 — 实现后架构与文档同步（architecture-sync）。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-evolve

## 目的

dev / test 完成后，**对齐设计与现实**：防止「代码已是真相、文档仍是幻想」，并为 integration 与后续维护留下可追溯 diff 说明。

## 何时使用

| 信号 | 动作 |
|------|------|
| 实现偏离 `DESIGN.md` 架构图或模块边界 | 必跑 |
| 多 dev slice 合并，DESIGN 未更新 | 必跑 |
| `taiyi_assess` = high | 建议在 test 后、review 前 |
| 实现与 DESIGN 完全一致 | 可写一行「无漂移」归档 |

## 输入

- `DESIGN.md`、`TASK.md`、`CHANGELOG` 草稿（若有）
- 实际代码树（`git diff` 相对 design 冻结点或 `main...HEAD`）
- （可选）`adr/`、`CONTEXT.md`
- （可选）`taiyi-health` 报告——辅助判断「漂移是否引入质量退化」

## 输出

- `.taiyi/changes/<slug>/architecture-sync.md`
- 提议的 **`DESIGN.md` 补丁**（可直接编辑或附 unified diff）
- 若决策级变化：触发 **`taiyi-architect` 新 ADR**（Status: accepted / superseded）

## 执行步骤

### 1. 建立对比基线

1. 标定「设计意图来源」：`DESIGN.md` 版本（commit 或日期）
2. `git diff --stat` + 重点路径列表（与 DESIGN Architecture 节交叉）
3. 列出 **新增 / 删除 / 移动** 的模块（表格式）

### 2. 漂移分类

| 类型 | 定义 | 处理 |
|------|------|------|
| **Cosmetic** | 命名、文件位置，行为不变 | 更新 DESIGN 图示即可 |
| **Structural** | 新组件、边界变化、依赖反转 | 更新 DESIGN + 考虑 ADR |
| **Behavioral** | 对外契约、错误码、性能特征变 | 更新 REQUIREMENT 追溯 + ADR |
| **Expedient** | 临时 workaround，已知技术债 | TASK 记债 + DESIGN Open Questions |

### 3. 逐节对账

对 `DESIGN.md` 每个主章节填：

- **仍准确** ✓
- **已过时** ✗ + 实际现状一句话
- **建议补丁**（粘贴可合并段落）

### 4. 决策升级判断

若漂移涉及以下任一项 → **必须** `taiyi-architect`：

- 存储 / 鉴权 / 公开 API 形状
- 删除 ADR 曾接受的方案
- 引入新上游依赖（网络、许可证、运维）

### 5. 输出 architecture-sync.md

写入 Summary、漂移表、补丁、开放债项；文末 **Gate**：

- [ ] DESIGN 已更新或明确「无需更新」理由
- [ ] 新 ADR 已建（若需要）
- [ ] TASK 未完成任务已关闭或转新 slug

### 6. 与 integration 衔接

`CHANGELOG.md` 可引用 architecture-sync 的 **用户可见行为变化**；`taiyi_sync_openspec` 前确保 `design.md` 与 DESIGN 一致。

## architecture-sync.md 模板

```markdown
# Architecture Sync: <slug>

## Baseline

- DESIGN 基线：…
- 代码范围：`main...HEAD`（N files）

## Drift Summary

| 类型 | 区域 | 设计说 | 实现是 | 处理 |
|------|------|--------|--------|------|
| Structural | auth | session | JWT | ADR-0004 + 补丁 §3 |

## DESIGN.md 对账

### Architecture

- 仍准确：…
- 已过时：…
- 补丁：

\`\`\`markdown
（可粘贴进 DESIGN 的段落）
\`\`\`

## 技术债 / Open Items

- [ ] …

## Gate

- [x] DESIGN 已更新
- [x] ADR-0004 accepted
```

## 与主流程

```
taiyi-dev → taiyi-test → [taiyi-evolve] → taiyi-review → taiyi-integration
```

- evolve **不替代** test：测试证明行为，evolve 证明文档与结构
- review 时应核对 architecture-sync Gate；未关闭的 Structural 漂移 → review **Request changes**

## 质量自检

- [ ] 每条漂移有 **文件路径证据**
- [ ] Cosmetic 未粉饰成 Structural（避免隐瞒契约变化）
- [ ] 补丁可独立应用，不依赖聊天上下文
- [ ] 与 `TEST.md` 覆盖范围一致（测了的边界 = 文档写的边界）

## 与双线 harness

- integration 时把 architecture-sync 摘要并入 README/ARCHITECTURE 更新清单
- **OpenSpec**：`sync-openspec` 前跑 evolve，避免规格与实现分叉

## 禁止

- 静默改架构不留文档
- 只改代码不更新 DESIGN 就 `taiyi complete review`
- 把 expedient workaround 标为 Cosmic 而不记债
- 在 evolve 中扩大 scope（新功能走新 CHANGE）
