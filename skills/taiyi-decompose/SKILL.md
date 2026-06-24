---
name: taiyi-decompose
description: TaiyiForge 辅助 — 把项目 README/PRD 拆解为独立可执行的 change slug 清单。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-decompose

## 目的

把一份大的需求文档（README、PRD、技术方案）拆成一组互不阻塞的 TaiyiForge change，每个 change 带推荐 profile、依赖关系和优先级。

## 何时使用

decompose 跑在九阶段之前，是整个流程的上游：

```
/taiyi:sp decompose（拆解）
       │
       ▼ 产出 DECOMPOSE.md + 批量 /taiyi:new
       │
  ┌────┴────┬────┬────┐
  ▼         ▼    ▼    ▼
change  change change change（各自走九阶段）
```

| 信号 | 建议 |
|------|------|
| 新项目拿到 README / PRD，不知道从哪开始 | 必跑 |
| 大功能涉及多个模块，想做并行开发 | 必跑 |
| 需求文档包含 5 个以上独立功能点 | 必跑 |
| 只有一个 typo 或单文件改动 | 跳过 |

## 输入

- 项目需求文档（README.md / PRD / 技术方案）
- （可选）项目现有代码结构
- （可选）已有 change 列表（`/taiyi:list`）

## 输出

一份结构化拆解计划，写到 `.taiyi/DECOMPOSE.md` 或用户在聊天里直接审阅。

格式：
```markdown
# Decompose: <项目名>

> 来源：<README/PRD 路径> · 日期 · 拆解人

## 拆解清单

| # | Slug | 范围 | Profile | 依赖 | 优先级 |
|---|------|------|---------|------|--------|
| 1 | user-auth | 注册/登录/权限 | full | — | P0 |
| 2 | product-crud | 商品增删改查 | full | — | P0 |
| 3 | order-flow | 下单/支付/状态机 | full | user-auth, product-crud | P1 |

## 依赖关系图

user-auth ──┐
            ├──→ order-flow
product-crud┘

admin-dashboard ←── user-auth

## 执行建议

| 规则 | 说明 |
|------|------|
| **最多同时活跃** | ≤ 5 个 change 并行，人脑追太多会乱 |
| **超过 5 个** | 分波：Wave 1 先跑 ≤5 个，到 dev 后手动启动 Wave 2 |
| **micro/nano** | 不受限制，随时插队 |
| **依赖处理** | 强依赖的 change 先建但不推进，等被依赖方到 dev 后再走 |


**Wave 2 手动启动**：

Wave 1 创建完后，Agent 输出提醒并记录到 DECOMPOSE.md：

> ⏳ Wave 2 待启动：payment-gateway, notification, analytics
> 等 Wave 1 的 change 都到 dev 阶段后，说「启动 Wave 2」我立刻创建。

用户说「启动 Wave 2」后，Agent 从 DECOMPOSE.md 读计划并批量 `/taiyi:new`。

**示例：8 个 change，分两波**

```
Wave 1（立即创建，并行推进）：
  /taiyi:new "user-auth" --profile full
  /taiyi:new "product-crud" --profile full
  /taiyi:new "order-flow" --profile full
  /taiyi:new "admin-dashboard" --profile full
  /taiyi:new "deploy-scripts" --profile micro

Wave 2（Wave 1 到 dev 后说「启动 Wave 2」手动创建）：
  payment-gateway (api), notification (lite), analytics (lite)
```
```

## 执行步骤

### 1. 读取需求

1. 完整读取用户指定的需求文档
2. 提取所有功能描述、验收条件、非功能需求
3. 标注哪些功能之间有关联

### 2. 识别独立模块

按以下规则判断一个功能是否独立：

| 判定 | 规则 |
|------|------|
| 可独立开发 | 不依赖其他模块的 API/数据库表/类型定义 |
| 有少量依赖 | 只依赖已存在的基础设施（auth 框架、数据库连接） |
| 有强依赖 | 必须等另一个模块先完成 |

### 3. 推荐 profile

对每个待拆解的模块，按决策树判断：

```
这个改动涉及前端 UI？
├── 是 → 涉及多个模块 + 需要多人 review？
│        ├── 是 → full（九阶段全走，有 UI 设计 + 人类评审）
│        ├── 否，仅前端 UI 改动，后端不动 → ui（走 UI 设计阶段，跳过需求/设计）
│        └── 否，一个人前后端全栈 → lite（跳过设计/评审，5 阶段）
│
└── 否 → 纯后端 / 脚本 / 工具？
         ├── 需要写设计文档 + 多人 review？→ api（跳过 UI 阶段，其他全走）
         ├── 原型验证/技术探索？→ spike（4 阶段：change→dev→test→integration）
         ├── 单文件改动/配置？→ micro（3 阶段：change→dev→integration）
         └── typo/注释/格式化？→ nano（2 阶段：dev→integration，零文档）
```

**追问清单**（不确定时问用户）：

1. 「这个模块有前端 UI 吗？」
2. 「需要别人 review 还是你一个人拍板？」
3. 「是要上线还是探索性验证？」
4. 「改动范围多大——几个文件？」

**输出时必须在每个 slug 后标注推荐理由**：

| Slug | Profile | 理由 |
|------|---------|------|
| user-auth | full | 涉及登录 UI + 权限模型，需多人 review |
| product-crud | full | 有管理后台 UI，核心业务 |
| deploy-scripts | micro | 纯 CI 脚本，单文件改动 |

### 4. 输出拆解计划

1. 先列出所有 change slug 和一句话范围
2. 标注每个的 profile 和理由、依赖关系
3. 画出依赖关系（文字图即可）
4. 给出推荐执行顺序
5. **超过 5 个必须分波**：Wave 1 先跑 ≤5 个，后面按依赖排队
6. 如果超过 5 个，询问用户：

> 一共拆出 N 个 change，超过 5 个了。建议分两波：
> - Wave 1（立即创建）：<列出>
> - Wave 2（等 Wave 1 到 dev 后再建）：<列出>
> 
> 这样安排可以吗？

### 5. 用户确认

把计划展示给用户，**一次问完**：

> 计划如上，一共 N 个 change。确认吗？
> - **自动创建**：我立刻 `/taiyi:new` 全部建好
> - **手动创建**：你自己逐个调，可以改 slug 名或 profile
> - **调整**：哪部分需要改？

### 6. 自动创建（用户选「自动」时执行）

用户选择自动后，**立即按依赖顺序创建所有 change**：

**执行规则**：
1. P0、无依赖的 slug → **立即并行创建**（互不阻塞）
2. P1、有依赖的 slug → 紧接其后创建
3. 按拆解计划中的 profile 参数

**执行方式**：自动调用 `/taiyi:new`，不要等用户手动敲。

```
/taiyi:new "user-auth" --profile full
/taiyi:new "product-crud" --profile full
/taiyi:new "order-flow" --profile full
/taiyi:new "deploy-scripts" --profile micro
```

创建完后输出汇总：

```
✅ 已创建 N 个 change：

| Slug | Profile | 状态 |
|------|---------|------|
| user-auth | full | change 阶段 |
| product-crud | full | change 阶段 |
| ... | | |

下一步：/taiyi:status 看进度，/taiyi:continue 推进
  建议先并行推进 <P0无依赖的slug>
```

## 质量自检

- [ ] 每个 slug 的范围边界清晰，不重叠
- [ ] 依赖关系标注完整
- [ ] profile 选择有依据
- [ ] 执行顺序合理（无循环依赖）
- [ ] 用户已确认计划

## 禁止

- 在拆解阶段就开始写 CHANGE.md
- 把明显耦合的功能拆进不同 slug
- 给 P0 功能推荐 nano/micro profile
- 跳过用户确认直接创建 change（确认后必须自动批量创建）
