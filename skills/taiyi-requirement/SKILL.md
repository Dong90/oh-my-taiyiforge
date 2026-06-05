---
name: taiyi-requirement
description: TaiyiForge 第 2 阶段 — 需求与验收标准，产出 REQUIREMENT.md。四端通用。
---

# taiyi-requirement

## 目的

把 CHANGE 里的意图变成**可测试的用户故事与 AC**，供 design/dev/test 追溯。

## 输入

- `CHANGE.md`（必读）
- （可选）`CONTEXT.md`

## 输出

- `.taiyi/changes/<slug>/REQUIREMENT.md`

## 执行步骤

1. 从 CHANGE Scope 拆 **User Stories**（表格式）
2. 每条故事写 **Given / When / Then** AC
3. **Traceability** 表：AC ↔ CHANGE Success Criteria
4. 标优先级：MVP / 后续
5. `npx taiyi guide <slug>` 确认 qualityHints 为空
6. `npx taiyi complete <slug> requirement`（lite profile 后进入 dev）

## AC 写法

```markdown
### US-1
- **Given** 用户已登录
- **When** 点击导出
- **Then** 下载 CSV 且 HTTP 200
```

## 质量自检

- [ ] 每条 AC 可自动化或手动步骤验证
- [ ] 含 Traceability 或指向 CHANGE
- [ ] 无 UI 需求时注明「验证方式：API/CLI」

## 与铁三角

- OpenSpec：已 init 时对照 `openspec change show <slug>`

## 禁止

- AC 含糊（「更快」「更好」无量化）
- 引入 CHANGE Out of scope 外的功能
