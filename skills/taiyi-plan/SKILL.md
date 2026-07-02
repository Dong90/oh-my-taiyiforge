---
name: taiyi-plan
description: TaiyiForge /taiyi:plan — 项目规划入口：把 README/PRD 拆解为独立 change 清单，推荐 profile 和依赖关系。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-plan

## 目的

作为 TaiyiForge 的规划阶段，在 `/taiyi:new` 之前运行。把一份大的需求文档（README、PRD、技术方案）拆成一组互不阻塞的 change，每个 change 带推荐 profile、依赖关系和优先级，然后批量创建。

## 何时使用

`/taiyi:plan` 跑在九阶段之前，是整个流程的第一个入口：

```
/taiyi:plan（规划阶段）
       │
       ▼ 产出 PLAN.md + 批量 /taiyi:new
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

## 何时不用

- 单文件改动，直接 `/taiyi:new` 走 micro
- 已经有了完整的 slug 清单
- 纯技术改动（升级依赖、修 lint）直接 micro/nano

## 输入

`/taiyi:plan` 可以接文件路径，支持任何能读出文字的内容：

| 输入 | 用法 | 提取方式 | 工具 |
|------|------|---------|------|
| 本地 Markdown | `/taiyi:plan docs/PRD.md` | `Read` 直接读取 | 内置 |
| 纯文本 | `/taiyi:plan requirements.txt` | `Read` 直接读取 | 内置 |
| PDF | `/taiyi:plan docs/spec.pdf` | `look_at` 或 `pdftotext` 提取文本 | `look_at` / `pdftotext` |
| Word 文档 | `/taiyi:plan docs/设计文档.docx` | `python-docx` 或 `pandoc` 转文本 | `python-docx` / `pandoc` |
| 网页 / 在线文档 | `/taiyi:plan https://wiki.example.com/prd` | `webfetch` 抓取后解析 | `webfetch` |
| 不指定文件 | `/taiyi:plan` | 自动找 README.md，找不到则询问 | `glob **/README.md` |

**执行方式**：
1. 读取指定文件 → 提取全部文字内容
2. 如果是非文本格式（PDF/docx），先用对应工具提取文本（PDF 优先 `look_at`，docx 回退到 `python-docx`）
3. 将提取的文字作为需求输入，进入正常的拆解流程

## 自动模式（`--auto`）

`/taiyi:plan README.md --auto` 与普通模式的核心区别：

| 维度 | 普通模式 | `--auto` 模式 |
|------|---------|---------------|
| 用户确认 | **必须**等用户确认后再创建 | **跳过**用户确认，拆完即创建 |
| 拆解计划 | 写到 `.taiyi/PLAN.md` + 聊天审阅 | 直接写到 `.taiyi/PLAN.md`，不展开聊 |
| Profile 选择 | 按决策树问用户 | 按决策树**自动判断**（拿不准时默认 full） |
| 创建方式 | 用户选"自动创建"才批量 `/taiyi:new` | 立即批量 `/taiyi:new` |
| 交互节奏 | 慢：展示 → 确认 → 创建 | 快：一行命令跑完 |

**执行差异**：

1. 依然需要走完"读取需求 → 识别模块 → 冲突检测 → 拆解计划"全部步骤
2. 拆解计划写完后，**不等用户确认**，直接进入批量创建（Step 6）
3. 创建完成后输出汇总，用户直接进入 `/taiyi:status` 看进度
4. `--auto` 模式下如果遇到模棱两可的选择（如不确定用 full 还是 api），**往大选**（full > api > lite），宁浪费一点流程也不能漏掉关键步骤

> `--auto` 不改变拆解逻辑，只改变确认节奏。用户信任 AI 的拆解判断时可省一次来回。

## 输出

一份结构化拆解计划，写到 `.taiyi/PLAN.md` 或直接在聊天里审阅。

格式：
```markdown
# Decompose: <项目名>

> 来源：<README/PRD 路径> · 日期 · 拆解人

## 拆解清单

| # | Slug | 范围 | Profile | 依赖 (depends_on) | 共享资源 | 可并行 | 优先级 |
|---|------|------|---------|--------------------|----------|--------|--------|
| 1 | user-auth | 注册/登录/权限 | full | — | auth 框架 | ✅ 与 product-crud | P0 |
| 2 | product-crud | 商品增删改查 | full | — | auth 框架 | ✅ 与 user-auth | P0 |
| 3 | order-flow | 下单/支付/状态机 | full | user-auth | user-auth 的 session API | ❌ 等 1,2 | P1 |

## 依赖关系与并行度

```
真并行组：user-auth ⚡ product-crud（不共享业务文件）
     │              │
     └──────┬───────┘
            ▼
       order-flow（依赖 session API，等 user-auth 到 dev）
```

> 并行标记：⚡ = 不共享文件可同时推进，❌ = 有共享资源需排队

## 整体进度追踪

此 PLAN.md 创建后，每次完成一个 change 的归档，手动更新进度行：

```
⏳ 进度: [░░░░░░░░░░] 0/3 change 完成
         user-auth (change) · product-crud (change) · order-flow (pending)
```

格式惯例：
- `pending` — 未创建
- `(当前阶段名)` — 推进中
- `✅` — 已完成归档

## 执行建议

| 规则 | 说明 |
|------|------|
| **最多同时活跃** | ≤ 5 个 change 并行，人脑追太多会乱 |
| **超过 5 个** | 分波：Wave 1 先跑 ≤5 个，到 dev 后手动启动 Wave 2 |
| **micro/nano** | 不受限制，随时插队 |
| **依赖处理** | 强依赖的 change 先建但不推进，等被依赖方到 dev 后再走 |


**Wave 2 手动启动**：

Wave 1 创建完后，Agent 输出提醒并记录到 PLAN.md：

> ⏳ Wave 2 待启动：payment-gateway, notification, analytics
> 等 Wave 1 的 change 都到 dev 阶段后，说「启动 Wave 2」我立刻创建。

用户说「启动 Wave 2」后，Agent 从 PLAN.md 读计划并批量 `/taiyi:new`。

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

按功能拆分，用以下规则判断是否可并行：

**2.1 功能边界**

看 README 中的功能描述，每个独立用户故事就是一个候选 change：
- 「用户可以注册登录」→ user-auth
- 「用户可以浏览商品」→ product-browse
- 「用户可以下单支付」→ order-flow

**2.1a 粒度准则**（量化判定合并/拆分）

拆太粗 → 一个 change 包含多个独立功能，无法并行。拆太细 → 多个 change 改同一堆文件，合代码时冲突爆炸。

| 条件 | 判定 | 处理 |
|------|------|------|
| 两个功能**共享文件比例 > 50%**（如改同一个 controller 的所有方法） | 太碎 | **合并为一个 change** |
| 两个功能**共享文件 20%–50%**（如改同一文件的不同区域） | 弱分离 | 各自独立 change，PLAN.md 标注共享文件，dev 阶段注意不重叠 |
| 两个功能**共享文件 < 20%**（如不同包/不同目录） | 真分离 | 各自独立 change，真并行 |
| 一个功能**内部可拆为互不重叠的子模块**（如 "登录" 和 "权限管理" 虽在 auth 域但文件不重叠） | 可再拆 | 拆为多个 change，标注 `真并行` |
| 一个功能**估算工期 < 30 分钟**（如加一个配置项） | 太碎 | 并入关联 change 或改走 micro/nano |

**量化方法**：看一眼两个功能预期改动的文件列表，数重叠文件数：

```
重叠比例 = 交集文件数 / 并集文件数 × 100%

user-auth:  src/auth/login.ts, src/auth/session.ts, src/middleware/auth.ts
admin-panel: src/auth/login.ts, src/admin/dash.ts, src/admin/users.ts

交集: {src/auth/login.ts} → 1
并集: {src/auth/login.ts, src/auth/session.ts, src/middleware/auth.ts, src/admin/dash.ts, src/admin/users.ts} → 5
重叠比例: 1/5 = 20% → 弱分离 → 各自独立
```

> **不要对着代码做精确计算**。按功能描述估算文件级重叠度就可以，不用真的去读源码。重点是避免"把耦合的拆开"或"把可并行的合并"。

**2.2 共享资源检测（借鉴 Claude Code 的隔离策略）**

Claude Code 的 sub-agent 能真并行，是因为它们操作不同目录、不共享文件。我们的 change 也一样：

| 共享什么 | 判定 | 处理 |
|----------|------|------|
| 不共享文件/表/接口 | **真并行** | 同时 `/taiyi:new`，各自推进 |
| 共享基础设施（auth/DB 连接） | **弱依赖** | 可并行创建，但 dev 阶段注意不要同时改同一个文件 |
| 共享业务表或 API 接口 | **强依赖，需排队** | A 到 dev 后 B 再开始 |
| 用同一个文件 | **冲突，按策略处理** → | 见下方「文件冲突处理」 |

### 文件冲突处理

当两个 change 需要修改同一个文件时：

| 策略 | 适用场景 | 做法 |
|------|---------|------|
| **合并** | 改同一文件、同一功能域 | 两个 change 合并 |
| **拆分文件** | 改同一文件、不同功能域 | 先把文件拆成两个 |
| **约定区域** | 改同一文件、不同函数 | 各自改不重叠区域，顺序合 |
| **排队** | 以上都不行 | A 先合 main，B rebase 后再改 |

规划阶段输出**预期改动文件清单**，重叠自动标冲突：

```
| Slug | 预期改动文件 | 冲突 |
|------|-------------|------|
| user-auth | src/auth/login.ts, src/register.ts | — |
| admin-panel | src/auth/login.ts, src/admin/dash.ts | ⚠️ 与 user-auth 共享 login.ts |
```

### 2.3 上下文隔离评估

每个 change 的 CONTEXT.md 只包含它需要的文件，不加载整个项目：

```
user-auth    → 只需关注 src/auth/、src/middleware/
order-flow   → 只需关注 src/orders/、src/payment/
              ← 两者不重叠 → 真并行
```

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

### 5a. 调整/重新规划

用户选了"调整"时，不要从头开始。按修改类型走不同路径：

| 用户说 | 处理方式 |
|--------|---------|
| "这几个合并" | 把涉及 slug 的预期文件列表合并，重新算冲突/依赖/profile |
| "这个不要了" | 从拆解清单删掉这一行，更新总数和依赖关系 |
| "这个改 profile" | 只改这一行的 profile 列，重算依赖关系 |
| "再加一个功能" | 回到 Step 2 对这一功能做一遍拆解，追加到清单末尾 |
| "顺序调整" | 只改优先级的数字，依赖关系不变 |

调整完**重新展示**一遍完整清单，再次问用户确认。

### 6. 自动创建（用户选「自动」时执行）

用户选择自动后，**立即按依赖顺序创建所有 change**：

**执行规则**：
1. P0、无依赖的 slug → **立即并行创建**（互不阻塞）
2. P1、有依赖的 slug → 紧接其后创建
3. 按拆解计划中的 profile 参数

**种子模板对齐**：同一批创建的 change 共享项目级上下文。对每个 change 的 CHANGE.md 种子（`--title` / `--motivation` / `--description`），从原始需求文档中提取该模块对应的段落填入，使得 CHANGE.md 的"Motivation"和"Description"一开始就有内容，不是空模板。

**执行方式**：自动调用 `/taiyi:new`，不要等用户手动敲。

```
/taiyi:new "user-auth" --profile full
/taiyi:new "product-crud" --profile full
/taiyi:new "order-flow" --profile full
/taiyi:new "deploy-scripts" --profile micro
```

**错误处理**：

| 场景 | 处理 |
|------|------|
| slug 已存在（部分失败） | 跳过已存在的 slug，继续创建剩余的。**不从头回滚**。最终汇总标出哪些是新建、哪些已存在 |
| slug 无效（含特殊字符） | 跳过该 slug，把问题打印出来，继续创建其他 |
| 磁盘空间不足 / 权限错误 | 全部失败，打印错误信息，建议用户检查磁盘/权限 |
| 批量中某个 `taiyi:new` 异常（如模板缺失） | 跳过该 slug，记到 `⚠️ 失败` 清单，继续创建其他 |
| **全部失败** | 打印全部错误，建议 `taiyi doctor` 诊断环境 |
| **部分成功** | 输出对比表：✅ 成功 / ⚠️ 失败 / ⏭️ 跳过 |

```
✅ 已创建 N 个 change（其中 ⚠️ 2 个失败）：

| Slug | Profile | 结果 |
|------|---------|------|
| user-auth | full | ✅ change 阶段 |
| product-crud | full | ✅ change 阶段 |
| order-flow | full | ⚠️ slug 已存在，跳过 |
| weird/name | full | ⚠️ 无效 slug，跳过 |

失败可手动处理：taiyi:new "order-flow" --profile full --force
下一步：/taiyi:status 看进度，/taiyi:continue 推进
```

创建完后输出汇总：

```
✅ 已创建 N 个 change：

| Slug | Profile | 状态 |
|------|---------|------|
| user-auth | full | change 阶段 |
| product-crud | full | change 阶段 |
| ... | | |

下一步：在 PLAN.md 更新进度追踪行
  建议先并行推进 <P0无依赖的slug>
```

## 质量自检

- [ ] 每个 slug 的范围边界清晰，不重叠
- [ ] 粒度：无超过 50% 文件重叠的独立 slug（应合并），无可进一步拆解的粗粒度 slug
- [ ] 依赖关系标注完整（depends_on 列无遗漏）
- [ ] profile 选择有依据（按决策树，不可凭感觉）
- [ ] 执行顺序合理（无循环依赖）
- [ ] 用户已确认计划（普通模式）
- [ ] 超过 5 个 change 已分波
- [ ] PLAN.md 的进度追踪行已初始化

## 禁止

- 在拆解阶段就开始写 CHANGE.md
- 把明显耦合的功能拆进不同 slug
- 给 P0 功能推荐 nano/micro profile
- 跳过用户确认直接创建 change（非 `--auto` 模式）
- 不标注 `depends_on` 就结束拆解
- 批量创建时部分失败不回滚（遇到错误只跳过，不删已成功的）
- 调整重规划时从头重做——基于已有清单增删改查即可
