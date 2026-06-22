---
name: taiyi-integration
description: TaiyiForge 第9阶段 — 闭环归档，CHANGELOG.md。四端通用。
paradigm: Operator
---

# taiyi-integration — 闭环归档

## 步骤
1. 跑全套自动化(npm test + build)，贴真实输出
2. 引导UAT逐条验收(通过/失败)
3. 失败诊断: root cause→fix-plan→回dev修→重跑。≤3轮
4. LESSONS提名: 扫SUMMARY"决策与偏离"。耗时>30min/不限于本任务→提名
5. CHANGELOG: Added/Changed/Fixed + Success Criteria Met
6. Rollback: 可执行步骤

## 内容规则（强制）

### Changelog（Step 1）
- ≥3 条条目（对有意义变更）
- 每条格式：`- **type**: description.`
- 禁止只写 1 行

### Migration（Step 2）
- SQL：若不涉及 schema 变更写 "N/A — 无 schema 变更"
- 环境变量：若不变写 "无变更"，否则列出新增/修改/删除
- 配置：若不变写 "无变更"，否则列出旧值/新值
- **禁止** `-- TODO` 残留

### Deployment Checklist（Step 3）
- 每项必须标注 ✅/❌/N/A，不留空 checkbox
- N/A 项写理由

### Observability（Step 4）
- Dashboard: 写具体工具/链接
- Alerts: ≥3 条告警（若无告警写 "N/A — <理由>"）
- Runbook: 写具体 runbook 链接或文档位置，或写 "无" + 理由

### Post-Launch Watch（Step 5）
- 观察期：具体小时数
- 观察指标：≥3 个指标
- 退出标准：量化标准

### Rollback Plan（Step 6）
- **`[量化条件]` → 具体阈值（如"E2E pass rate < 90%"）**
- **`[命令]` → 具体 git 命令**
- **`[N]min` → 具体分钟数**
- 禁止三个占位符残留

### Monitoring & Alerts（Step 7）
- ≥3 个指标
- 每个有基线 + 告警阈值 + 严重度

### Release Info
- **Version**: 禁 `0.0.0`，写实际版本号
- **Date**: 禁 `[日期]`，写 ISO 日期
- **Status**: 禁 `[deployed/pending]`，写实际状态

## 禁止残留（硬性）
- `[量化条件]` `[命令]` `[N]min` — 必须替换
- `[日期]` `0.0.0` `[deployed/pending]` — 必须替换
- `-- TODO` — 必须替换或写 N/A 理由
- 版本号不写占位符

## 完成
`npx taiyi complete <slug> integration` → `archive`

## 禁止
- 失败重试>3轮不暂停
- CHANGELOG只写refactor
- 在integration改CONTEXT.md
