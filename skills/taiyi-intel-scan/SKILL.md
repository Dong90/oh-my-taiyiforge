---
name: taiyi-intel-scan
description: TaiyiForge 辅助 — 代码库情报扫描，产出 CONTEXT.md（变更前可选）。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-intel-scan

## 目的

在写 CHANGE / REQUIREMENT 之前，把**与本次变更相关的代码现实**整理成一份可读情报，避免设计阶段凭空假设、重复造轮子或踩遗留坑。

## 何时使用

| 信号 | 建议 |
|------|------|
| 新 slug 刚 `taiyi init` | 默认跑一次 |
| `taiyi_assess` 为 medium / high | 必跑 |
| 不熟悉模块 / 跨多目录 | 必跑 |
| 单文件 typo 修复 | 可跳过 |

## 何时不用

- 变更范围已在当前会话完全掌握
- 纯文档 / 配置一字节代码不动（仍建议扫依赖与 CI）

## 输入

- 用户意图或 Issue 摘要
- （可选）`CHANGE.md` 草稿中的 Scope
- 项目根目录只读访问

## 输出

- 首选：`.taiyi/changes/<slug>/CONTEXT.md`（可从 `templates/CONTEXT.md` 种子起步）
- 多变更共享基线：`.taiyi/CONTEXT.md`（在文件头注明 `shared: true` 与适用 slug）

## 执行步骤

### 1. 划定扫描边界

1. 从用户描述提取 **3–7 个关键词**（模块名、路由、表名、API 前缀）
2. 用 `grep` / 语义搜索定位**入口文件**（路由注册、CLI、main、index）
3. 列出**直接相关目录**（不超过 15 个），注明「必读 / 参考 / 勿动」

### 2. 提取模式（Pattern Inventory）

记录项目**既有惯例**，后续阶段必须对齐：

| 类别 | 记录什么 | 示例 |
|------|----------|------|
| 目录结构 | 功能放哪 | `src/core/` vs `lib/` |
| 命名 | 文件、导出、测试后缀 | `*.test.ts` / `test_*.py` |
| 测试 | 框架、运行命令、覆盖率习惯 | `vitest run` |
| API / 数据 | REST 风格、ORM、错误形状 | `{ ok, error }` |
| 配置 | 环境变量、feature flag 位置 | `.env.example` |

### 3. 风险区标注

标 **RISK**（无测试、TODO 堆积、循环依赖、上帝文件）并给**证据路径**：

- 文件路径 + 行号或符号名
- 为何影响本变更（一句话）
- 建议：绕行 / 补测试 / 单独 slice

### 4. 阅读清单（Read First）

给出 **3–5 个文件**，按顺序，每文件一句话说明「读完知道什么」。

### 5. 与下游衔接

在文末写 **Handoff**：

- 对 `taiyi-change`：Scope 建议、Out of scope 提醒
- 对 `taiyi-design`：可复用组件、禁止重写的子系统
- 若发现架构级未知：建议 `taiyi-architect`

## CONTEXT.md 模板

```markdown
# CONTEXT: <slug>

> 生成：taiyi-intel-scan · 只读扫描，非设计结论

## Scope 摘要

<!-- 一句话 -->

## 相关目录

| 路径 | 关系 | 备注 |
|------|------|------|
| | 必读 / 参考 / 勿动 | |

## 模式清单

- 测试：`...`
- API：`...`
- 命名：`...`

## 风险区

| 级别 | 位置 | 说明 | 建议 |
|------|------|------|------|
| RISK | `path:line` | | |

## Read First

1. `path` — …
2. `path` — …

## Handoff

- change：…
- design：…
```

## 质量自检

- [ ] 每条结论有**路径证据**，无「据说」「可能」式空话
- [ ] 未在本 Skill 内改业务代码（只读）
- [ ] 篇幅可控：CONTEXT 建议 **80–200 行**，过长则拆「附录：文件索引」
- [ ] 与 `CHANGE.md` Scope 无矛盾；有矛盾则在 Handoff 标明

## 与工具链

- OpenCode：`taiyi_assess` 推荐本 Skill 时自动出现在 guide
- 复杂仓库可叠加 **gstack map-codebase** 类 Skill，摘要写入 CONTEXT，不替代本工件

## 禁止

- 扫描结论直接写进 `DESIGN.md`（情报 ≠ 决策）
- 未读文件就列「架构图」
- 把 intel-scan 当成 refactor 许可证
