---
name: taiyi-requirement
description: TaiyiForge 第2阶段 — 需求分析，REQUIREMENT.md。四端通用。
paradigm: Partner
---

# taiyi-requirement — 需求分析

## 步骤

### 1. User Stories（强制）
- ≥3 条
- **必须**使用 "As a <角色> / I want <功能> / So that <价值>" 完整格式
- 禁止写成名词短语（例 ❌："Nine-phase workflow runs" → 例 ✅："As a CI pipeline, I want the nine-phase workflow to run automatically so that I can validate every release"）

### 2. Scope Partitioning（强制）
- v1（本次必做）≥3 条
- v2（下次）≥2 条
- out（永不）≥2 条

### 3. Functional Requirements（强制）
- ≥5 条 FR，编号 FR-01 起
- 每条可独立测试
- 分模块组织

### 4. Acceptance Criteria（强制）
- ≥3 条 AC，对应 FR
- **每条必须**用 Given/When/Then 格式
- 每条附带可执行的验证命令（写到 `验证:` 字段）

### 5. Non-Functional Requirements（强制）
- 性能：≥1 条带数值
- 安全：≥1 条
- 可用性：≥1 条
- 每条必须带具体数值指标

### 6. Error & Rescue Map（强制）
- ≥5 种错误类型
- 每行：错误类型 / 触发 / 捕获 / 用户看到 / 恢复路径

### 7. Shadow Path Analysis（强制）
- Happy / Nil / Empty / UpstreamErr 四路径逐条标注
- 每条有输入+预期输出

### 8. Non-Happy-Path Matrix（强制）
- ≥5 种边界/异常场景（含空值/超时/并发/权限/非法输入）

### 9. Dependencies（强制）
- ≥3 条依赖
- 每行含依赖名 / 类型 / 状态 / 风险

### 10. Security & Compliance（强制）
- ≥3 个检查项

## 禁止残留
- `[填写理由]` `[...]` `TODO` 禁止
- User Stories 禁止写成名词短语
- AC 禁止写"应该能通过"——必须写可执行验证命令
- 空表格禁止（每个表至少 ≥1 行数据）
- 数量未达下限 → 不通过自检

## 自检清单
- [ ] User Stories ≥3 条且格式为 As a / I want / So that
- [ ] FR ≥5 条
- [ ] AC ≥3 条，用 Given/When/Then
- [ ] NFR 每条带具体数值
- [ ] Error/Rescue ≥5 种错误
- [ ] Shadow Path 四路径完整
- [ ] Non-Happy-Path ≥5 种场景
- [ ] Dependencies ≥3 条
- [ ] Security ≥3 检查项
- [ ] 无 `[填写理由]` `TODO` 残留
- [ ] 无空表格

## 完成
`npx taiyi complete <slug> requirement`

## 禁止
- AC含糊(无量化)
- 在REQUIREMENT写技术方案
- 跳过Traceability
