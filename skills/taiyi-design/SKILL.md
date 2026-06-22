---
name: taiyi-design
description: TaiyiForge 第3阶段 — 技术设计(≥2方案)，DESIGN.md。四端通用。
paradigm: Architect
---

# taiyi-design — 技术设计

## 0. 既有架构对齐(Brownfield)
- 列出触碰模块/新增模块/禁动清单
- 对齐既有抽象，禁止"顺便引新库"
- 沿用模式vs引入新模式（须充分理由）

## 内容深度规则（强制）

### 1. Context & Constraints
- 所有字段必须填：技术栈/前端/后端/数据库/部署/关键依赖/明确排除
- 不留空括号 `[列出]`
- 明确排除 ≥3 项

### 2. Architecture Overview
- Mermaid 图必须表达**本 change 的具体结构**，禁止通用 `Client → Service → DB`
- 模块清单 ≥3 行：模块名 / 操作（新增/修改/删除）/ 路径 / 说明
- 既有架构触碰模块 ≥3 个

### 3. Options Analysis（强制）
- **≥3 个方案**（含"不改/最小改动"对照）
- 每行有方案名/思路/优点(≥2)/缺点(≥2)/代价

### 4. Decision（强制）
- ≥2 句理由
- 必须包含**数据/约束**支撑，禁止"感觉这个好"
- 必须说明取舍了什么

### 5. Detailed Design（***核心，最关键***）
**本节是设计文档的心脏。禁止 `TODO` `-- TODO` `[TODO:` 残留。**

- 数据模型：具体字段/类型/索引
- API 契约：请求/响应/错误码
- 关键流程：Mermaid 时序图 + 错误路径
- 缓存/并发/一致性方案（如适用）

如确为 N/A（如 CLI-only 无 API）→ 每项写 "N/A — <具体理由>"，禁留 `TODO`

### 6. Blast Radius（强制）
- ≥3 个决策
- 每行：决策 / 爆炸半径 / 最坏情况 / 隔离措施

### 7. Innovation Token Accounting
- 累计不得 >3
- 每个"是"有充分理由
- 数字与本 CHANGE.md 一致

### 8. Trade-off Analysis（强制）
- ≥3 个权衡点
- 每行：权衡点 / 选择 / 接受理由

### 9. Distribution & Deployment
- CI/CD 变更必须具体说明
- `[无/CLI/npm/Docker/其他]` 必须替换为具体值

### 10. Security Model（强制）
- **≥3 个 STRIDE 威胁**，每个含具体缓解措施
- 禁止笼统缓解（例 ❌："参数校验" → 例 ✅："Commander 参数校验 + zod schema 白名单"）

### 11. Rollout Strategy
- 灰度比例 + 观察时间 + 回滚触发条件，三者都写

### 12. Architecture Evolution
- ≥1 条可复用抽象建议或写明"无建议"

## 禁止残留
- `TODO` `-- TODO` `[TODO:` 在 Detailed Design 中 → **门控拦截**
- 单方案（必须 ≥2 方案对比）
- 架构图通用无具体内容
- 决策 1 句理由无数据
- `[列出]` `[无/CLI/npm/Docker/其他]` 等空括号
- "使用最佳实践"空话

## 自检清单
- [ ] Context & Constraints 全字段填充
- [ ] Mermaid 图是本 change 的具体图
- [ ] Options ≥3 方案
- [ ] Decision ≥2 句 + 数据支撑
- [ ] Detailed Design 无任何 `TODO` 残留
- [ ] Blast Radius ≥3 行
- [ ] Security ≥3 个 STRIDE 威胁 + 具体缓解
- [ ] Trade-off ≥3 行
- [ ] Rollout 有灰度/观察/回滚
- [ ] 无空括号 `[...]` 残留
- [ ] 无空表格

## 完成
`npx taiyi complete <slug> design --approver "名"`(人工门)

## 禁止
- 单方案无记录
- 在DESIGN写任务切片
- "使用最佳实践"空话
