# TaiyiForge 配置文件总览

> **何时读**：初始化项目、定制 commit/PR/交付链、排查「配置从哪来」。

TaiyiForge 配置分 **三层**：包内契约 YAML（随版本发版）→ 项目 `.taiyi/` 覆盖 → 环境变量最高优先级。

---

## 1. 配置地图

| 层级 | 路径 | 职责 | 谁改 |
|------|------|------|------|
| **包契约** | `docs/taiyi/*.yaml` | 九阶段、质量门禁、工作流 manifest、**交付默认** | TaiyiForge 维护者 |
| **项目开关** | `.taiyi/config.json` | scenario、profile、**deliveryGate** 等布尔/枚举 | 项目 init / 人工 |
| **项目交付** | `.taiyi/delivery.yaml` | commit 模板、git base、ship/land、verify | DevOps / TL |
| **Provider** | `.taiyi/providers.yaml` | 第三方 CLI 能力路由（OpenSpec、Playwright…） | `install --all` 检测 |
| **Runner** | `.taiyi/runner-policies.yaml` | Ralph / autopilot 策略扩展 | 高级用户 |
| **Token 预算** | `.taiyi/token-budget.yaml` | 覆盖 `docs/taiyi/token-budget.yaml` | 按需 |
| **Code style** | `.taiyi/code-style.yaml` | 代码生成风格 | codegen 阶段 |
| **Package** | `package.json` → `taiyi.deliveryVerifyCmd` | 交付验证命令兜底 | 项目 npm |
| **环境变量** | `TAIYI_*` | CI / 本地临时覆盖 | Shell / CI |

**不要**把长模板、PR body、land 脚本塞进 `config.json` — 用 `.taiyi/delivery.yaml`。

---

## 2. `.taiyi/config.json`（只留开关）

```json
{
  "scenario": "service",
  "defaultProfile": "api",
  "deliveryGate": true,
  "harness": { "minimal": false },
  "approver": { "mode": "prompt" },
  "autoSkipUiDesign": false
}
```

| 字段 | 说明 |
|------|------|
| `scenario` | 场景 playbook（service / mvp / micro …） |
| `defaultProfile` | 默认 change profile |
| `deliveryGate` | `false` 关闭 integration 交付门；env `TAIYI_DELIVERY_GATE` 可覆盖 |
| `deliveryVerifyCmd` | **deprecated** — 仍可读且**覆盖** yaml；新项写 `delivery.yaml` |
| `commitTrailers` | **deprecated 且无效** — 不能用 config 关 trailer；仅 `TAIYI_COMMIT_TRAILERS=0` |

生成：`taiyi init-wizard` 或 `/taiyi:init`。

---

## 3. `.taiyi/delivery.yaml`（交付细节）

默认真源：`docs/taiyi/delivery.yaml`（deep merge，项目文件只写差异）。

### 3.1 commit — 固定格式

```yaml
commit:
  subjectTemplate: "[{slug}] {type}: {summary}"
  bodyTemplate: ""
  defaultType: feat
  defaultSummary: deliver change slice
  maxSubjectLength: 72
  requiredTrailers:
    - key: Taiyi-Change
      value: "{slug}"
    - key: Taiyi-Phase
      value: "{phase}"
```

变量：`{slug}` `{phase}` `{type}` `{summary}` `{subject}`

引擎：`taiyi commit-trailers [slug] [subject]` · 交付门 trailer 校验。

### 3.2 git

```yaml
git:
  defaultRemote: origin
  branchTemplate: "feat/{slug}"
  baseBranches:
    - origin/develop
    - origin/main
```

### 3.3 verify

```yaml
verify:
  command: npm run ci:verify
```

**优先级**：`TAIYI_DELIVERY_VERIFY_CMD` > `config.json` `deliveryVerifyCmd` > **yaml** > `package.json` `taiyi.deliveryVerifyCmd`

### 3.4 ship / land

```yaml
ship:
  provider: gh          # gh | manual
  push: true
  preCommands: []
  pr:
    titleTemplate: "[{slug}] {summary}"
    base: null
    draft: false

land:
  provider: manual      # gh | manual
  waitCi: false
  merge:
    method: squash
    deleteBranch: true
  postMergeCommands: []
  healthUrl: null
```

### 3.5 chain

```yaml
chain:
  steps:
    - commit
    - verify
    - ship
    - land
    - continue-integration
    - archive
  requireConfirm:
    - ship
    - land
```

预览命令清单：

```bash
taiyi delivery-plan [slug]          # 人类可读
taiyi delivery-plan [slug] --json   # Agent 机读
```

---

## 4. 包内契约 YAML（一般不改）

| 文件 | 内容 |
|------|------|
| `docs/taiyi/phases.yaml` | 九阶段顺序与 artifact |
| `docs/taiyi/quality-gate.yaml` | 质量门禁五维 |
| `docs/taiyi/workflow-manifest.yaml` | 双线 harness + CLI 能力 |
| `docs/taiyi/commands.yaml` | 斜杠命令真源 |
| `docs/taiyi/token-budget.yaml` | Token 预算默认 |
| `docs/taiyi/delivery.yaml` | **交付默认真源** |
| `docs/taiyi/providers.yaml` | Provider 注册表模板 |

---

## 5. 环境变量（常用）

| 变量 | 作用 |
|------|------|
| `TAIYI_DELIVERY_GATE` | `0` / `1` 覆盖交付门 |
| `TAIYI_DELIVERY_VERIFY_CMD` | 覆盖 verify 命令 |
| `TAIYI_COMMIT_TRAILERS` | `0` 关闭 trailer 校验（仅本地/演示） |
| `TAIYI_SKIP_QUALITY_GATE` | 跳过五维门禁 |
| `TAIYI_AUTO_HARNESS` | 全自动编排 |

完整列表见 [USAGE.md](../USAGE.md)。

## 5.1 环境变量完整列表（src 实现真源）

按模块分组；每行 `TAIYI_* | 默认 | 影响模块`。

### 引擎模式 / Loop（`src/core/runtime/mode-orchestrator.ts` / `loop-runner.ts`）

| 变量 | 默认 | 影响 |
|---|---|---|
| `TAIYI_RALPH_MAX_ROUNDS` | 无 | `taiyiRalph` 单循环最大轮次 |
| `TAIYI_LOOP_MAX` | 无 | `taiyiLoop` 最大轮次 |
| `TAIYI_LOOP_MAX_ROUNDS` | 无 | loop 单次 run 轮次 |
| `TAIYI_REVIEW_LOOP_MAX_ROUNDS` | 无 | `taiyiReviewLoop` 轮次 |
| `TAIYI_TEAM_MAX_FIX` | 无 | `taiyiTeam` 修复轮次 |
| `TAIYI_REPEAT_MAX` | 无 | repeat-parse 最大次数 |
| `TAIYI_ULW_AUTO_TASK` | `0` | Ultrawork 自动派发 |
| `TAIYI_ULW_TASK` | 无 | Ultrawork task 模式 |
| `TAIYI_AUTO_HARNESS` | `0` | 阶段 complete 自动跑 harness |
| `TAIYI_AUTO_HUMAN` | `0` | 自动过人工门 |
| `TAIYI_STRICT_INTEGRATION` | `0` | integration 必须人工 --approver |

### Hooks / 守护（`src/install/run.ts` / `dev-phase-guard.ts` / `claude-phase-guard-hook.mjs`）

| 变量 | 默认 | 影响 |
|---|---|---|
| `TAIYI_EARLY_CODE_BLOCK` | `1` | dev 前硬拦改业务代码 |
| `TAIYI_EARLY_CODE_GUARD` | `1` | 同上（兼容性别名） |
| `TAIYI_PHASE_GUARD` | `ask` | phase guard 行为：`block` / `ask` / `off` |
| `TAIYI_FORGE_INSTALL` | opencode,claude,codex,cursor | 逗号分隔，postinstall 仅装指定端 |
| `TAIYI_FORGE_INSTALL_DEPS` | `1` | postinstall 自动装 OpenSpec / Superpowers |
| `TAIYI_FORGE_SKIP_DEPS` | 无 | postinstall 跳过 deps 装 |
| `TAIYI_FORGE_SKIP_HOOKS` | 无 | install 跳过 hook 写入 |
| `TAIYI_FORGE_SKIP_MCP` | 无 | install 跳过 MCP 配置 |
| `TAIYI_FORGE_SKIP_OPENCODE_CONFIG` | 无 | install 跳过 opencode.json plugin 写入 |
| `TAIYI_FORGE_SKIP_PKG_SCRIPTS` | 无 | install 跳过 npm scripts 写入 |
| `TAIYI_FORGE_SKIP_POSTINSTALL` | 无 | postinstall 跳过 |
| `TAIYI_FORGE_SKIP_PROJECT_WRAPPER` | 无 | install 跳过 scripts/taiyi-forge.sh wrapper |
| `TAIYI_FORGE_ROOT` | 无 | 引擎 dev 仓根目录（默认 `.taiyi/forge-root`） |
| `TAIYI_FORGE_FORCE_PROJECT_WRAPPER` | 无 | 强制重写 wrapper |
| `TAIYI_FORGE_ALL_PROMPTS` | 无 | 同步所有 prompts（覆盖默认 diff 模式） |

### Agent / Roles（`src/core/agent-roles.ts`）

| 变量 | 默认 | 影响 |
|---|---|---|
| `TAIYI_AGENT_STRICT_PHASE` | `0` | `1` = 角色仅在推荐阶段加载 |

### Human Gate（`src/core/gates/human-gate-config.ts`）

| 变量 | 默认 | 影响 |
|---|---|---|
| `TAIYI_HUMAN_GATE_PHASES` | `change,design,review` | 逗号分隔，列出需 `--approver` 的阶段 |

### Token 预算（`src/core/token/budget-config.ts`）

| 变量 | 默认 | 影响 |
|---|---|---|
| `TAIYI_TOKEN_BUDGET` | 500000 | 全局 token 预算 |
| `TAIYI_TOKEN_ENFORCE` | `0` | `1` = 超预算禁 complete |
| `TAIYI_TOKEN_DISABLED` | `0` | `1` = 整个 token 模块禁用 |
| `TAIYI_TOKEN_COST_PER_M` | `3` | 每百万 token 估算费用 |
| `TAIYI_TOKEN_COMPRESS_THRESHOLD` | 120000 | 工件 token 超此触发 compress |

### Daemon（`src/core/daemon-runner.ts`）

| 变量 | 默认 | 影响 |
|---|---|---|
| `TAIYI_DAEMON_MAX_ROUNDS` | 无 | daemon 最大轮次 |
| `TAIYI_DAEMON_INTERVAL_MS` | 无 | daemon 轮询间隔 |
| `TAIYI_DAEMON_ENGINE_ONLY` | 无 | daemon 仅跑引擎不调 agent |
| `TAIYI_DAEMON_SKIP_AGENT` | 无 | daemon 跳过 agent 步骤 |
| `TAIYI_DAEMON_PLATFORM` | claude | daemon 调用的 agent 平台 |
| `TAIYI_DAEMON_AGENT_CMD` | 无 | daemon agent 自定义命令 |

### Ralph / Quality（`src/core/runtime/mode-orchestrator.ts` / `gates/`）

| 变量 | 默认 | 影响 |
|---|---|---|
| `TAIYI_RALPH_VERIFY_CMD` | 无 | Ralph verify 步骤命令 |
| `TAIYI_SKIP_QUALITY_GATE` | `0` | `1` = 跳五维门禁 |
| `TAIYI_SKIP_INTEGRATION_AUDIT` | `0` | `1` = 跳 integration audit |
| `TAIYI_SKIP_ROOT_CHANGELOG` | `0` | `1` = 跳根 CHANGELOG 校验 |

### Workflow / Status（`src/integrations/workflow-manifest.ts` / `cli/taiyi.ts`）

| 变量 | 默认 | 影响 |
|---|---|---|
| `TAIYI_WORKFLOW_MANIFEST` | `default` | 选择 manifest preset：`default` / `optimized` / 路径 |
| `TAIYI_WORKSPACE` | 无 | MCP / CLI 工作区根目录（默认 cwd） |
| `TAIYI_WORKSPACE_DIR` | 无 | 同上别名 |
| `TAIYI_LANGUAGES` | 无 | `,` 分隔语言 tag，手动覆盖 `project-detect.ts` 自动探测 |
| `TAIYI_TEMPLATE_RELOAD` | `0` | `1` = hbs 模板无缓存 |
| `TAIYI_STATUS_DEBOUNCE` | `0` | `1` = status 命令 5s 去抖（per-slug） |

### MCP / LSP（`src/mcp/lsp-tools.ts`）

| 变量 | 默认 | 影响 |
|---|---|---|
| `TAIYI_LSP` | `on` | `off` = 关 LSP 工具（typecheck/lint/tsc） |

### Logger（`src/core/logger.ts`）

| 变量 | 默认 | 影响 |
|---|---|---|
| `TAIYI_LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |

完整变量名经 `scripts/check-docs-sync.mjs` 自动校验（实现 ↔ 文档 drift 检测）。

---

## 6. 推荐落地顺序

1. `npx taiyi-forge-install --all` + `taiyi init-wizard`
2. 复制 `docs/taiyi/delivery.yaml` → `.taiyi/delivery.yaml`，只改 `commit` / `ship.pr`
3. `config.json` 只设 `scenario`、`defaultProfile`、`deliveryGate`
4. `taiyi delivery-plan <slug>` 核对 ship/land 步骤
5. CI 用 `TAIYI_DELIVERY_VERIFY_CMD` 或 yaml `verify.command`

---

## 8. 要不要「整合成一个文件」？

**结论：物理文件不要合并；代码层做统一入口即可。**

| 做法 | 建议 | 原因 |
|------|------|------|
| 全部塞进 `config.json` | ❌ | 长模板、YAML 列表难维护 |
| 全部塞进一个 `taiyi.yaml` | ❌ | provider / delivery / token 变更频率与负责人不同 |
| **保持多文件 + `resolveWorkspaceConfig()`** | ✅ | 各域独立 schema；doctor/MCP 一次读取 |

引擎入口：`src/core/workspace-config.ts` → `resolveWorkspaceConfig(workspaceDir)` 返回：

- `project` — `.taiyi/config.json`
- `delivery` — 双层 `delivery.yaml` merge 结果
- `tokenBudget` — `docs/taiyi/token-budget.yaml` + env
- `files` — 哪些项目级文件存在

**仍独立加载的域**（不宜并入 delivery）：

- `providers.yaml` — install 检测写入，Capability 路由
- `runner-policies.yaml` — Ralph 策略
- `code-style.yaml` — codegen 脚手架
- `docs/taiyi/phases.yaml` 等 — 包契约，项目一般不覆盖

---

- [delivery-gate.md](./delivery-gate.md) — 交付门规则
- [delivery-slash.md](./delivery-slash.md) — `/taiyi:commit` → ship → land
- [artifact-layout.md](./artifact-layout.md) — `.taiyi/changes/<slug>/`
