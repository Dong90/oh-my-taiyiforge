# TaiyiForge v1 Architecture — Schema-Driven Workflow Engine

## 动机

当前 v0.23 引擎是**纯编排层**：写模板 → 人工/AI 填内容 → heuristic 校验 → 过关。AI 的格式输出完全依赖 Prompt 约定，没有结构化约束，导致：

- 格式漂移：同一个 REQUIREMENT.md 不同 Agent 写出来结构不一致
- 校验粗糙：314 行 heuristic 规则靠正则猜字段是否存在
- 人类修改后无法同步：Markdown 是真源，但引擎只读不解析

v1 引入 **Zod Schema** 作为真源 + **Handlebars 模板** 做视图渲染 + **LLM Tool Calling** 做结构化生成。Markdown 降级为人类可读的视图，JSON 成为引擎解析的真源。

## 核心原则

1. **Schema 即契约**：每个阶段的输出由 Zod Schema 严格定义，LLM 通过 tool calling 强制输出合法 JSON
2. **JSON 真源，MD 视图**：`.taiyi/changes/<slug>/<phase>.json` 是引擎读写的真源；`<PHASE>.md` 由 Handlebars 模板渲染，人类可编辑
3. **反向同步**：人类修改 MD 后，引擎用 mini LLM 逆向解析，将 MD 的变更合并回 JSON
4. **自愈循环**：LLM 输出不合法时，引擎把 Zod 错误注入下一轮对话，逼 LLM 自我纠正
5. **渐进改造**：每次只改造一个阶段，旧阶段继续走 heuristic 校验，不影响已有功能

## 架构分层

```
┌──────────────────────────────────────────────────────┐
│  用户 / AI Agent                                      │
│  /taiyi:write  /taiyi:continue  /taiyi:apply          │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│  CLI / Plugin / MCP（入口层，不改）                     │
│  src/cli/taiyi.ts  src/plugin/  src/mcp/             │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│  Workflow Engine（编排层，部分改）                      │
│  src/core/workflow-engine.ts                         │
│  ┌──────────────┐ ┌───────────────┐ ┌──────────────┐ │
│  │ executor.ts  │ │ state-manager │ │ reverse-sync │ │
│  │ (新增)       │ │ (新增)        │ │ (新增)       │ │
│  └──────────────┘ └───────────────┘ └──────────────┘ │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│  Schema Layer（新增）                                  │
│  src/schemas/  — Zod Schema 定义 → toolSchema          │
│  src/templates/ — Handlebars 模板 → MD 渲染            │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│  Validation（增强）                                    │
│  src/core/artifact-validator.ts                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Zod 校验层（新）→ 通过后走 legacy heuristic（旧）  │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│  Persistence                                         │
│  .taiyi/changes/<slug>/  — 工件目录                   │
│  ├── CHANGE.md          ← Handlebars 渲染              │
│  ├── change.json        ← Zod 真源（新增）             │
│  ├── REQUIREMENT.md                                    │
│  ├── requirement.json   ← （新增）                     │
│  └── ...                                               │
│  .taiyi/snapshots/      ← Hash 快照（新增）             │
└──────────────────────────────────────────────────────┘
```

## 数据流

### 生成阶段（/taiyi:write → AI 写作）

```
用户敲 /taiyi:write
  → engine 根据当前阶段输出：
    - 应加载的 Skill
    - Zod Schema（tool calling 格式）
    - Handlebars 模板路径
  → AI Agent 调用 LLM：
    - system prompt = 上下文拼装
    - tool_choice = commit_<phase>（强制走 tool）
    - LLM 输出 JSON → Zod parse 校验
    - 失败 → 错误注入重试（最多 3 次）
  → state-manager.persistAndRender()：
    - 写 <phase>.json（真源）
    - 渲染 <PHASE>.md（视图）
    - 写 .taiyi/snapshots/<phase>.hash
```

### 过关阶段（/taiyi:continue）

```
用户敲 /taiyi:continue
  → engine.completePhase()
  → checkAndSyncHumanEdits(currentPhase)
    → 读 <PHASE>.md 的当前 hash
    → 与 snapshots/<phase>.hash 比对
    → 不一致 → mini LLM 逆向同步（MD → JSON）
    → 一致 → 跳过
  → readPhaseJson(currentPhase)  ← 只读 JSON，不读 MD
  → tailerContext = JSON 片段
  → generateStageData(nextPhase, tailerContext)
  → persistAndRender(nextPhase, data)
  → artifact-validator → Zod 校验 + heuristic 补充
  → gates → 推进
```

### 人类修改路径

```
人类直接编辑 REQUIREMENT.md
  → 保存 → Hash 变化
  → 下一次 /taiyi:continue
  → checkAndSyncHumanEdits 检测到 Hash 变化
  → 起 mini LLM（gpt-4o-mini）：
    - 输入：旧 JSON + 新 MD
    - 输出：合并后的新 JSON（tool calling）
  → 覆盖 requirement.json
  → 更新 Hash 快照
  → 引擎用新 JSON 继续推进
```

## 关键设计决策

| 决策 | 理由 |
|------|------|
| **不改 workflow-engine.ts 主流程** | 最小改动原则；在 continue 路径插入 sync + exec 钩子 |
| **只改一个阶段先试点（REQUIREMENT）** | 降低风险；验证 Zod+Handlebars+ReverseSync 铁三角可行后横向铺开 |
| **Mock LLM in tests** | 测试不应依赖外部 API；executor 接受 `llmClient` 参数做依赖注入 |
| **Hash 用 SHA256** | 跨平台一致；Node 内置 crypto 模块无需额外依赖 |
| **mini LLM 用 gpt-4o-mini** | 反向同步是轻量任务（MD→JSON mapping），不需要大模型 |
| **快照目录独立（.taiyi/snapshots/）** | 不污染 changes 目录；恢复/回滚时可单独操作 |

## 文件清单

```
新增：
  src/schemas/requirement.ts          Zod Schema + toolSchema
  src/templates/requirement.hbs       Handlebars 模板
  src/core/executor.ts               生成 + 自愈重试
  src/core/state-manager.ts          持久化 + 渲染 + Hash
  src/core/reverse-sync.ts           反向同步
  src/core/hash-utils.ts             弃用 getHash 单独文件

测试：
  tests/schemas/requirement.test.ts
  tests/templates/requirement.test.ts
  tests/core/executor.test.ts
  tests/core/reverse-sync.test.ts
  tests/core/state-manager.test.ts

修改：
  src/cli/taiyi.ts                   加 continue 的 JSON 读取快捷路径
  src/core/artifact-validator.ts     对 REQUIREMENT 阶段追加 Zod 校验
  src/core/workflow-engine.ts        completePhase 前调用 reverse-sync
  package.json                       加 zod, zod-to-json-schema, handlebars
```

## TDD 实施顺序

```
Step 0: Schema + 模板（纯函数，无外部依赖）
  tests/schemas/requirement.test.ts     → src/schemas/requirement.ts
  tests/templates/requirement.test.ts   → src/templates/requirement.hbs
                                        → src/core/state-manager.ts

Step 1: 执行器（mock LLM）
  tests/core/executor.test.ts          → src/core/executor.ts

Step 2: 反向同步（mock LLM）
  tests/core/reverse-sync.test.ts      → src/core/reverse-sync.ts

Step 3: 集成到 artifact-validator
  tests/core/artifact-validator-zod.test.ts  → 改 src/core/artifact-validator.ts

Step 4: 横向铺开 DESIGN / TASK / ...
  每个阶段复刻 Step 0-3 的模式
```

## 与现有架构的兼容

- v0.23 的所有 CLI 命令入口不变
- v0.23 的 heuristic 校验仍对未改造阶段生效
- `state.json` 格式不变
- `<!-- taiyi:seed-template -->` 标记机制不变（改为模板内嵌）
- CI 测试全部保留并通过

## 进阶优化路线图

### 1. Prompt Caching（提示词缓存）— 优先级：中

**痛点**：长链路中，Zod Schema 结构、项目架构原则等「大头」内容每次 /taiyi:continue 都重复计算 Token。

**方案**：利用 Anthropic / OpenAI 的 Prompt Caching 技术，将极少变动的背景信息（Schema JSON、项目规则）放在 Prompt 最前面并打 `cache_control` 标签，频繁变动的用户指令放后面。

**效果**：缓存命中后输入 Token 成本降 90%，TTFB 从秒级降到百毫秒。

**依赖**：需先接入真实 LLM API（当前仅 mock 客户端）。

---

### 2. Diff Router（旁路拦截）— 优先级：高 ⬅ 当前实施

**痛点**：reverse-sync 机制对任何 MD 修改都呼叫 LLM，包括「勾选 checkbox」或「改错别字」这类无需 LLM 的微操作。浪费 Token 且有小概率被 LLM 篡改其他字段。

**方案**：在 `checkAndSyncHumanEdits` 之前插入 Diff Router：

```
MD Hash 变化
  ↓
  本地文本 Diff（旧 MD vs 新 MD）
  ↓
  ┌─ 仅 checkbox 勾选变更 → 直接修改 JSON（is_checked），0 LLM 调用
  ├─ 仅单行文本替换（标题/描述）→ 正则提取 + JSON 覆写
  └─ 大段新增 / 语义变更      → 呼叫 mini LLM 深度合并
```

**效果**：99% 的 IDE 微操作绕过 LLM，反向同步几乎无延迟。

**实现文件**：`src/core/reverse-sync.ts` 新增 `bypassLlmLite()` 本地处理器，在 `checkAndSyncHumanEdits` 中优先尝试。

---

### 3. JSON Patch（RFC 6902）输出 — 优先级：低

**痛点**：大规模 DESIGN（如 50 个 API 接口）每次要求 LLM 输出全量 JSON，输出 Token 成本高、速度慢。

**方案**：让 LLM 输出 JSON Patch 数组而非全量数据：

```json
[{"op": "replace", "path": "/features/2/description", "value": "修复了登录延迟"}]
```

引擎本地 Apply Patch 到 `.taiyi/design.json`。

**效果**：输出 Token 断崖式下跌，响应近乎瞬时。

**依赖**：需 LLM 支持 JSON Patch 输出格式；对小型项目（<10 字段）收益不大。

---

### 4. Fan-out / Fan-in 多 Agent 并发 — 优先级：低

**痛点**：TASK 拆分 10 个独立任务后，单一 Agent 串行写代码。

**方案**：基于强类型 JSON（`tasks: [{id: 1}, {id: 2}]`），引擎在 DEV 阶段并发唤起 N 个 Agent，各自携带独立 Task Context 并行实现，REVIEW 阶段 `Promise.all` 收集合并。

**效果**：dev 时间从几十分钟压缩到几分钟。

**依赖**：需多 Agent 基础设施（spawn_agent / Task 派发），当前引擎无此能力。
