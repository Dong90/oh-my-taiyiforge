---
name: taiyi-integration
description: TaiyiForge 第9阶段 — 闭环归档，CHANGELOG.md。四端通用。
paradigm: Operator
---

# taiyi-integration — 闭环归档

> 进入本阶段前请优先读 `.taiyi/changes/<slug>/PHASE-CONTEXT.md`（~500 tokens），不要全量加载上游工件。

## 框架集成

本阶段使用以下框架：

| 框架 | 用途 | 何时加载 |
|------|------|---------|
| **Harness** | 阶段过关（`status` → `continue`）与归档（`archive`） | 全程 |
| **OpenSpec** | `archive` 命令内部将 artifacts 同步到 openspec 格式 | 步骤 4 归档时（自动） |
| **GStack** | `ship/land` — 创建 PR 和部署交付链 | 归档后（可选） |
| **Superpowers** | `finishing-a-development-branch` — 分支收尾决策 | 归档后 |

**Spec-Kit** 和 **OMO** 在本阶段不涉及。

## 前置门禁（Pre-flight）

### 0.1 上游确认
- review 阶段已过关（REVIEW.md 存在，⭐ 汇总 ≥ 4.0）
- 全部测试通过（npm test / pytest / cargo test exit 0）
- git diff 与 base 分支的差异干净（无临时文件、调试日志）

### 0.2 Profile 判定

| Profile | 集成要求 |
|---------|---------|
| `full` | 完整：integration 工件 + docs sync + 全量测试 + 归档 |
| `api/ui` | 同 full |
| `lite` | 同 full |
| `spike/micro` | 简化：integration 工件 + 全量测试 + 归档，可跳过 docs sync |
| `nano` | 极简：dev 后直接进入 integration 工件 + 归档（可省略 docs sync） |

### 0.3 前置检查清单
- [ ] REVIEW.md 存在且无 Open critical findings
- [ ] 所有测试通过（实跑确认）
- [ ] 无未提交的改动

---

## 步骤

### 工件契约

| 层 | 路径 | 职责 |
|----|------|------|
| **语义真源** | `integration.json` | Zod（`src/schemas/integration.ts`） |
| **生成视图** | `CHANGELOG.md`（**变更目录内**） | hbs（`src/templates/integration.hbs`） |
| **流程** | 本 Skill | docs sync、全量测试、archive |

**工作流**：编辑 `integration.json` → `render <slug> integration` → `continue` → `archive`。

与**项目根** `CHANGELOG.md` 分开；`archive` 可合并到根。详见 [`docs/taiyi/artifact-contract.md`](../../docs/taiyi/artifact-contract.md)。

### json 字段（Zod 摘要）

| 字段 | 要求 |
|------|------|
| `title` | 集成标题 |
| `changelog_entries` | ≥1 条；`type`（feat/fix/…）+ `description` |
| `release_version` / `release_date` / `status` | 可选 |
| `breaking_changes` | 可选 |
| `alerts` / `monitoring` / `post_launch` | 可选；上线观察 |
| `rollback_trigger` / `rollback_step1` … | 可选 |

### 0. Integration 工件（引擎过关必填 · 变更目录）

与**项目根** `CHANGELOG.md` **分开** — 过关校验的是变更目录内工件：

| 路径 | 用途 |
|------|------|
| `.taiyi/changes/<slug>/integration.json` | Zod 真源（`changelog_entries` 等；缺则 `status` 报 blockers） |
| `.taiyi/changes/<slug>/CHANGELOG.md` | hbs 从 json 渲染的 Keep a Changelog 切片 |

`continue` 过关后引擎可将变更 CHANGELOG **合并**到项目根 `CHANGELOG.md`；docs sync 可提前更新根文档，**不能代替**上表工件。

**变更目录 CHANGELOG.md** 示例（渲染后形态参考）：

```
## [Unreleased]

### Added
- auth-timeout: login session 可配置超时时间 (#42)
```

### 1. 文档同步（docs sync · 项目根）

检查并更新**项目级**文档（非过关工件，但 full/lite 归档前建议完成）：

```
### 1.1 README.md
- [ ] 需要更新？根据当前 diff 确认

### 1.2 CLAUDE.md / AGENTS.md
- [ ] 如果有新约束、新命令模式或新模块路径，更新

### 1.3 项目根 CHANGELOG.md（full/lite · 可与步骤 0 内容对齐）
- [ ] 是否已有版本号（VERSION / package.json version）
- [ ] 在 `## [Unreleased]` 或新版本号下加一条：
  > - <slug>: <一句话总结> (#<PR 号>)
```

### 2. 通过全量测试

在最终状态下运行全量测试：

```
$ npm test 2>&1 | tail -20
# 输出显示全部通过
```

**全量测试必须全部通过才能归档**。如果因为本 change 导致已有测试失败 → 修复实现，不能跳过。

### 3. 过关与归档

**先过关，再归档**（`archive` **不**代替 `continue` 写 integration 工件）。

1. 确认步骤 **0** 的 `CHANGELOG.md` + `integration.json` 已写好。
2. 预检：`scripts/taiyi-forge.sh status <slug> --json --compact` — 确认工件与 `blockers`。
3. 用户确认后过关：`scripts/taiyi-forge.sh continue <slug>`（integration 阶段过关）。
4. 过关后再 `status --json --compact`，确认 workflow 已完成。
5. 归档：`scripts/taiyi-forge.sh archive <slug>`

**archive 前检查**：
- ✅ review 已过关（`continue` 完成）
- ✅ 步骤 0 integration 工件齐全且已 `continue` 过关
- ✅ 全部测试通过
- ✅ 项目根 CHANGELOG 已更新（full/lite，可与引擎合并结果核对）
- ✅ README/CLAUDE.md 有更新（full/lite）
- ✅ git 状态干净

**archive 后**：
- `.taiyi/changes/<slug>/` 完整保留在磁盘
- change 从 `taiyi list` 活跃列表中移除
- 回到基线状态，可开始下一个 change

Legacy：`npx taiyi complete <slug> integration` 仍可用于过关；`npx taiyi archive <slug>` 用于归档。

---

### 4. 更新项目记忆（可选）

如果本 change 产生了可复用的学习结论，写入 `taiyi remember`：

```
npx taiyi remember --note "lesson: 翻译 API 流式响应用 SSE 而非 WebSocket"
```

## 过关与收尾

按 **步骤 3** 执行：`status` → `continue` → `status` → `archive`。

完成后在对话中对用户说一句整合回应，结构：**做了什么（动词开头）+ 核心成果 + 下步建议**。例如：
> 已归档 `auth-timeout`。login 超时时间可在 `config.toml` 的 `session.ttl` 配置（默认 30 分钟，可设 1-1440）。建议下一个 change 做 Token 自动刷新，依赖关系为空闲。

## 产出

- `.taiyi/changes/<slug>/CHANGELOG.md`（integration 过关工件）
- `.taiyi/changes/<slug>/integration.json`
- `.taiyi/changes/<slug>/`（archive 后完整档案）
- 项目文档更新（README.md / CLAUDE.md / 根 `CHANGELOG.md`）
- `.taiyi/project-memory.json`（如果调了 `remember`）

## 与下游衔接

本阶段是最后一个 TaiyiForge 阶段。输出可以导向：
- **CLI 发布**：`npx taiyi commit <slug>` + `npx taiyi ship <slug>`
- **PR 创建**：`npx taiyi ship <slug>`
- **下一个 change**：`npx taiyi new "..."`（当前 change archive 后）

## 异常处理

| 场景 | 处理 |
|------|------|
| 全量测试失败 | DIAGNOSE → 判断是否因本 change 导致。是 → 修复。否 → 确认是否是 pre-existing 失败，如预先存在则记录后继续（非本 change 责任） |
| REVIEW.md 有 open findings | **不能归档**。`scripts/taiyi-forge.sh undo <slug> review` 后完成修订 |
| 缺少 integration.json | 补全 Zod 字段后 `status` 再 `continue` |
| changelog 格式不匹配现有风格 | 按已有 changelog 格式写，不要另起风格 |
| docs sync 发现须改但已不在 scope | 记录为 TODO，在 CHANGELOG 或 README 中标注"后续更新" |
| `continue` 被拒 | 读 blockers → 补步骤 0 工件 → `status` 再试 |
| `archive` 报错 | 读输出 → fix → 重试 archive。**最多 1 次自动重试** |
| 未跟踪文件残留 | `git status` 识别残留（调试日志 / 临时文件）→ 确认有意或 gitignore → 清理 |
| 误过关本阶段 | workflow 完成后不可 undo；archive 前可用 `undo <slug> integration` |

<fatal_constraints>
- NEVER archive without all tests passing (exit 0).
- NEVER archive with unresolved critical REVIEW findings.
- NEVER skip integration 工件（变更目录 CHANGELOG.md + integration.json）for full/lite profiles.
- NEVER leave unused dependencies in package.json.
- NEVER modify project archive directory structure — archive is read-only after completion.
- NEVER write a vague summary sentence — "做了什么（动词开头）+ 核心成果 + 下步建议".
</fatal_constraints>

## 质量自检

- [ ] 前置门禁已通过（0.1–0.3）
- [ ] 变更目录 `CHANGELOG.md` + `integration.json` 已写好
- [ ] docs sync 已完成（README/CLAUDE/根 CHANGELOG，full/lite）
- [ ] 全量测试全部通过（实跑证据）
- [ ] `continue` 过关成功
- [ ] 无未跟踪文件残留
- [ ] archive 成功
- [ ] 对话中已给出整合回应
- [ ] 项目记忆已更新（如有可复用结论）

## 引擎门控（自动，无需手动确认）

- **CHANGELOG 质量**: 必须存在且非种子 → 阻止
- **工件完整性**: 所有非跳过阶段工件存在且非种子 → 阻止
- **覆盖率阈值**: 单元测试覆盖率 < 80% → 阻止
- **审计**: schema/gate/export/AC/dep/commit 六项审计 → 阻止
- **架构复查**: 可设 TAIYI_STRICT_INTEGRATION 严格拦截
- **投产就绪**: health endpoint / scripts / CORS
