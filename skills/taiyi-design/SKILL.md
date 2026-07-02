---
name: taiyi-design
description: TaiyiForge 第3阶段 — 技术设计(≥2方案)，DESIGN.md。四端通用。
paradigm: Architect
---

# taiyi-design — 技术设计

> 进入本阶段前请优先读 `.taiyi/changes/<slug>/PHASE-CONTEXT.md`（~500 tokens），不要全量加载上游工件。

## 框架集成

本阶段使用以下框架：

| 框架 | 用途 | 何时加载 |
|------|------|---------|
| **Harness** | 阶段门禁与推进（`status` → `continue --approver`；legacy：`npx taiyi complete`） | 全程 |
| **Superpowers** | `brainstorming` — 可选，当多方案对比需要创意发散时加载 | Options 步骤前 |
| **OpenSpec** | 将 DESIGN.md 同步到 openspec 格式 | 可选 |
| **Spec-Kit** | 设计方案遵循 Spec-Kit 规范（≥2 方案、取舍记录） | 全程 |

**GStack** 和 **OMO** 在本阶段不涉及。

## 前置门禁（Pre-flight）

执行以下检查后再开始写 DESIGN.md：

### 0.1 Brownfield 对齐
- 列出触碰模块、新增模块、禁动清单
- 对齐既有抽象，禁止"顺便引新库"
- 沿用既有模式 vs 引入新模式（须充分理由，记录在 Context 中）

### 0.2 Profile 设计深度判定

| Profile | 设计深度 | 必含章节 |
|---------|---------|---------|
| `full` | 完整 | Context + Options(表格) + Decision + Architecture + Data Flow + Module Layout + Risks & Mitigations + Verification Checklist + Open Questions |
| `api` | 中等 | Context + Options + Decision + Module Layout，跳过 Data Flow / Verification Checklist |
| `ui` | 中等 | Context + Options + Decision + UI 组件树，跳过 Data Flow / Verification Checklist |
| `lite` | 精简 | 仅 Decision 说明 + Open Questions，可省多方案对比（但至少记录取舍理由） |
| `micro/spike` | 跳过 | 可省略 DESIGN.md（如门禁拦截则写一页 Decision Summary） |
| `nano` | 跳过 | 本阶段可直接过关 |

### 0.3 前置检查清单
- [ ] requirement 阶段已过关（`engineTruth` 确认）
- [ ] 影响面已在 CHANGE.md 中声明
- [ ] 了解现有架构（至少扫读 docs/ARCHITECTURE.md 或既有 DESIGN.md）

---

## 步骤

### 工件契约

| 层 | 路径 | 职责 |
|----|------|------|
| **语义真源** | `design.json` | Zod（`src/schemas/design.ts`） |
| **生成视图** | `DESIGN.md` | hbs（`src/templates/design.hbs`） |
| **流程** | 本 Skill | ≥2 方案、Brownfield、Verification Checklist 纪律 |

**工作流**：编辑 json → `scripts/taiyi-forge.sh render <slug> design` → `status` → `continue --approver "名"`。

详见 [`docs/taiyi/artifact-contract.md`](../../docs/taiyi/artifact-contract.md)。

### json 字段（Zod 摘要）

| 字段 | 要求 |
|------|------|
| `title` | 方案设计标题 |
| `options` | **≥2** 方案；`id` / `name` / `pros` / `cons` / `cost` |
| `decision` | `chosen`（方案 id）+ `reason` + 可选 `tradeoffs` |
| `existingArchitecture` | Brownfield：`touchedModules` / `newModules` / `doNotTouch` |
| `techStack` | 可选；选中栈 + 理由 |
| `modules` | 可选；模块清单（name / path / operation / description） |
| `tradeoffs` / `blast_radius` / `security_threats` | 可选；取舍与安全 |
| `evolutionSuggestions` | 可选；架构沉淀建议（无则 `[]`） |
| `dependency_sandbox` | 可选；依赖版本与替代方案 |

### 写作指引（填入 json，render 生成 DESIGN.md）

### 1. Context（设计上下文）

描述设计的背景和约束条件，让 reviewer 无需回读上游工件即可理解设计出发点。

```
## Context

**Brownfield**: [现有代码库/项目状态，是否增量修改]

**约束**:
- [技术栈约束，如 Python 3.11+, FastAPI]
- [性能约束，如 P99 < 200ms]
- [安全约束，如必须 JWT 认证]
- [兼容性约束，如向后兼容 API v1]
- [集成约束，如依赖未完成的 change X]
```

### 2. Options（方案对比）

**格式选择**：

| 条件 | 推荐格式 |
|------|---------|
| ≥3 方案 或 多维度对比（性能/复杂度/可维护性） | **表格版**（\| Option \| Summary \| Pros \| Cons \| Cost \|） |
| 2 方案且决策维度明确 | **章节版**（## 方案 A / ## 方案 B） |

**表格版示例**（适用于复杂变更）：
```
| Option | Summary | Pros | Cons | Cost |
|--------|---------|------|------|------|
| A | Adapter + Strategy 分层 | 独立测试每层；可替换；新增方向只需加子类 | 文件较多，小项目 over-engineering | ~350 LOC |
| B | 单 Service + 配置驱动 | 文件少（≈3）；定位快 | 方向增多 service 膨胀；切换 LLM 需改代码 | ~200 LOC |
```

**章节版示例**（适用于 2 方案）：
```
## 方案 A：python-jose + slowapi

**架构**: app/middleware/auth.py → JWTAuthMiddleware (FastAPI Depends)
**优点**: 各库职责单一，组合灵活；slowapi 支持多种存储后端
**缺点**: 多个依赖，需协调版本兼容

## 方案 B：FastAPI Users + fastapi-limiter

**架构**: FastAPI Users 认证框架，开箱即用
**优点**: 注册/登录/密码重置开箱即用
**缺点**: 耦合度高，定制困难；非标准 JWT 实现
```

### 3. Decision（决策）

```
## Decision

**选定**: 方案 [标识]

**理由**:
1. [首要理由，关联核心需求 / CHANGE Success Criteria]
2. [其次理由，关联非功能性需求 / 团队能力]
3. [取舍说明：放弃了什么方案/特性，为什么可接受]
```

- 每条决策记录：备选方案 → 选择理由 → 接受的代价
- 如多个独立决策点（例如：缓存选 Redis vs Memcached + 队列选 Celery vs arq），**分别记录各自 Decision**

### 4. Architecture（架构）

#### 4.1 架构图

用 ASCII art 或 Mermaid 展示系统结构：

```
┌─────────────────────────────────────┐
│            Component Name           │
│  ┌──────────┐  ┌──────────┐        │
│  │  Module  │  │  Module  │        │
│  └────┬─────┘  └────┬─────┘        │
│       │             │              │
│  ┌────▼─────────────▼─────┐        │
│  │         Core           │        │
│  └────────────────────────┘        │
└────────────────────────────────────┘
```

**要求**：
- 展示模块间依赖方向（`→` 或 `─→`）
- 标注外部服务 / 系统边界
- 体现分层关系（Controller → Service → Adapter）
- 图形不必完美 ASCII，但要清晰表达结构

#### 4.2 数据流

区分场景描述请求/数据流转：

```
**Data flow — 同步**:
Request → Middleware → Controller → Service → Adapter → Response

**Data flow — 流式/异步**:
Request → Controller → Service
  → async generator → SSE events
```

- 同步和异步（如有）**分别描述**
- 标注关键中间步骤（如缓存检查、限流判断、错误重试）

#### 4.3 模块文件树

只列本 change **新增/修改**的文件，按项目实际模块结构组织。以下为示意格式，**实际路径、文件名、层数按技术栈定**：

```
src/
├── <controller-layer>/      # 路由/控制器（如 controllers/、routes/、handlers/）
│   └── <new-file>.ts        # 本 change 新增/修改
├── <service-layer>/         # 业务层（如 services/、use-cases/）
├── <data-layer>/            # 数据层（如 repositories/、models/、db/）
├── <adapter-layer>/         # 外部集成（如 adapters/、clients/、providers/）
└── tests/
    └── <test-file>.ts       # 对应测试文件
```

**替代写法**（直列，适合短列表）：
```
- src/routes/translate.ts        # POST /api/translate（新增）
- src/services/translate.ts      # 翻译业务编排（新增）
- src/adapters/llm/openai.ts     # OpenAI LLM 调用（修改）
- src/tests/test_translate.py    # 单元测试（新增）
```

**要求**：
- 只列本 change **新增/修改**的文件，不列未改动的既有文件
- 重要文件标注职责（行内注释 `#` 或 `//`）
- 文件树边界应与后续 TASK.md `write_files` 一致
- 层名按项目已有风格（Controller / Handler / UseCase / Service / Repository 等）

### 5. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OpenAI API key 未配置导致运行时错误 | Medium | High | 启动时校验，缺失时早失败（config.py） |
| SSE 流式被 nginx 缓冲 | Low | Medium | 响应头加 `X-Accel-Buffering: no` |
| 新增方向需改 factory 逻辑 | Medium | Low | 注册表模式，新增只加注册行不改逻辑 |

- Likelihood（低/中/高）和 Impact（低/中/高）可选但推荐
- 每条 Mitigation 必须是**可执行动作**，不是"注意"或"小心"

### 6. Verification Checklist

这是跟 `taiyi-test` 的衔接契约。每条对应一个可执行的测试验证。

| # | Check | Method | Links to REQUIREMENT |
|---|-------|--------|---------------------|
| 1 | POST /translate 返回 200 + 正确翻译 | `pytest tests/test_controllers.py -k test_sync` | US-1 AC |
| 2 | 未认证请求返回 401 | `pytest tests/test_middleware.py -k test_unauthorized` | US-2 AC |
| 3 | 6 个翻译方向均可路由 | `pytest tests/test_strategies.py -v` | US-3 AC |

**要求**：
- **Method 列必须是可直接执行的命令**（含参数），不是"写测试"这种模糊描述
- Links to REQUIREMENT 列追踪到 REQUIREMENT.md 的 AC 编号
- Verification Checklist 也是 review 阶段确认测试覆盖的依据

### 7. Open Questions

记录设计阶段无法确定的问题及其结论：

```
## Open Questions

- [x] API 端口固定或可配置？ → 可配置（config.py）
- [ ] 日志写入文件还是 stdout？ → **待决策：需要 PM 确认**
```

- 已解决标注 `[x]`，未解决标注 `[ ]` 并标记待谁决策
- **本阶段结束时不应有未解决的高影响 Open Question**

### 8. Architecture 沉淀建议

入选阈值：可复用抽象 / 项目级决策 / 跨模块契约 / 依赖变动。无则写"无建议"。

```
## Architecture 沉淀建议

- Adapter + Strategy 分层 → 提取为项目级架构模式文档（建议 ADR-003）
```

---

## 过关（Harness）

1. 逐项检查 `## 质量自检`；有未通过项则不要过关。
2. 预检：`scripts/taiyi-forge.sh status <slug> --json --compact` — 解析 `engineTruth`（`qualityReady` / `blockers`）。
3. 用户确认后过关：`scripts/taiyi-forge.sh continue <slug> --approver "名"`（design 人工门）。
4. 过关后再 `status --json --compact`，读 `engineTruth`；若 `currentPhase` 已变为 `ui-design` 或 `task`，切换到对应 Skill 并通知用户。

Legacy：`npx taiyi complete <slug> design --approver "名"` 仍可用；聊天优先 `/taiyi:continue`。

## 产出

- `.taiyi/changes/<slug>/DESIGN.md`
- `.taiyi/changes/<slug>/design.json`

## 与下游衔接

| 下游 | 需要 |
|------|------|
| `taiyi-ui-design` | 组件定义 → UI 组件映射；数据流 → States 表；Brownfield 约束 → UI 约束范围 |
| `taiyi-task` | 模块列表 → 切片边界；文件树 → write_files 边界；禁动清单 → 不可修改区；Verification Checklist → 测试任务所需断言 |

## 异常处理

- `continue` 被拒：最常见原因是缺少人工 `--approver`、只有单方案（非 lite 以下 profile）、或 Open Questions 有未解决高影响项。展示原因 → 让用户决定补充方案或确认可接受 → status 再 continue。
- Brownfield 对齐检查发现架构冲突：在 Open Questions 中记录冲突，**不能**在 DESIGN 中预先决定架构变更。
- Profile 判定跳过本阶段但门禁拦截：确认 profile 设置 → 如是 skip profile（`micro`/`spike`/`nano`），向用户说明并人工放行。
- 误过关本阶段或后续：`scripts/taiyi-forge.sh undo <slug> design`。

<fatal_constraints>
- NEVER design with only one option (no comparison) — exception: lite/micro/spike profile.
- NEVER write task breakdown or implementation details in design.json / rendered DESIGN.md.
- NEVER use "use best practices" as rationale for a decision.
- NEVER make architecture decisions without recording trade-offs.
- NEVER introduce new libraries or patterns without explicit rationale in Options.
- NEVER skip Brownfield alignment check (0.1).
</fatal_constraints>

## 质量自检

- [ ] 前置门禁 3 项全部通过（0.1–0.3）
- [ ] Profile 判定已确认，DESIGN.md 深度符合 profile 要求
- [ ] Options ≥ 2 方案（full/api/ui profile），或记录了取舍理由（lite）
- [ ] 每条决策记录了选择理由和接受的代价
- [ ] Architecture 包含架构图 + 数据流（同步 & 异步）+ 文件树（full profile）
- [ ] Risks & Mitigations 已记录（full profile）
- [ ] Verification Checklist 每条均有可执行 Method（full/api profile）
- [ ] Open Questions 无未解决的高影响项
- [ ] 架构沉淀建议已处理（或写"无建议"）
- [ ] 没有写入任务切片或实现细节
