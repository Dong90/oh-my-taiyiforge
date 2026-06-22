---
name: taiyi-task
description: TaiyiForge 第5阶段 — 任务拆解，TASK.md。四端通用。
paradigm: Navigator
---

# taiyi-task — 任务拆解

## 内容规则（强制）

### Header
- `[N]` → 替换为实际 Slice 数
- `[X人天]` → 替换为实际人天估算
- `[最多N]` → 替换为实际并行数
- **禁止**占位符残留

### 每任务 7 字段
id / name / read_files / write_files / action / verify / done

### read_files vs write_files 边界
- read_files: 要修改的文件 + 要参考的既有模块
- write_files: 严格在 DESIGN 范围内
- 禁动清单文件不可写
- 每个 **file 必须写实际路径**，禁止占位

### 验收点（强制）
- 每个 Slice ≥3 条验收点
- 每条验收点必须可独立验证
- 禁止"代码写好"类验收

### 波次并行
Wave1: T01[P] T02[P] → Wave2: T03(依赖T01)

### 风险 & 回滚（强制）
- 每个 Slice ≥1 个风险评估
- 每个 Slice ≥1 个回滚方案（精确到命令 + 时间）

## 禁止残留
- `[N]` `[X人天]` `[最多N]` `[Score: N/10]` — 替换或写实际值
- verify 禁止写"代码写好" — 必须写可执行验证命令
- write_files 禁止包含禁动清单文件
- 验收点 <3 条 → 不通过

## 自检清单
- [ ] Header `[N]` `[X人天]` `[最多N]` 已替换
- [ ] 每个 Slice read_files/write_files 为实际路径
- [ ] 每个 Slice ≥3 条验收点
- [ ] 每个 Slice ≥1 个风险 + ≥1 个回滚方案
- [ ] verify 为可执行命令
- [ ] 无空表
