---
name: taiyi-dev
description: TaiyiForge 第6阶段 — TDD开发执行。四端通用。
paradigm: Operator
---

# taiyi-dev — TDD开发

## 步骤

### 1.4 沿用已有抽象grep(强制)
写新代码前grep同类模式(axios/fetch/httpClient/ErrorBoundary/use*)。贴入SUMMARY。

### 1.5 扫LESSONS(强制)
grep LESSONS.md，对active条目声明差异。相同方案→停手。

### 1.6 UI任务额外检查
确认UI-DESIGN.md存在。颜色/字体/间距从UI-DESIGN.md派生。禁硬编码hex。

### 1.7 Schema变更检查
生成可逆迁移(up+down)。grep确认当前结构。

### 1.8 破坏性变更高门槛
删>=5行/改公共导出/改API→grep引用→停手反问。

### 2. TDD红→绿→重构

### 3. 提交前diff边界verify
git diff与TASK write_files比对，越界→停。

### 4. 6维self-review(R1-R6)
R1认知过载/R2变更传播/R3知识重复/R4偶然复杂/R5依赖混乱/R6领域扭曲

### 5. SUMMARY + .dev-complete

## 禁止
- verify未通过标记完成
- 破坏性变更不走1.8协议
- 不grep就写新代码
