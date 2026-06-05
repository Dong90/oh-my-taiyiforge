---
name: taiyi-test
description: TaiyiForge 第 7 阶段 — 测试计划与运行证据，产出 TEST.md。四端通用。
---

# taiyi-test

## 目的

证明实现满足 AC：**测什么、怎么跑、实际结果**——用命令输出与退出码说话，拒绝「应该没问题」。

## 何时使用

| 信号 | 建议 |
|------|------|
| `dev` 已 complete | 必做 |
| high 复杂度 | test 后建议 `taiyi-evolve` |
| CI 已绿 | 仍要在 TEST.md 记录**本地复现命令** |

## 输入

- `REQUIREMENT.md` AC 列表
- 代码与 `.dev-complete`
- （可选）`architecture-sync.md`（evolve 后）
- CI workflow 参考

## 输出

- `.taiyi/changes/<slug>/TEST.md`

## 执行步骤

### 1. Test Plan 表

| 层级 | 范围 | 命令 | 覆盖 AC |
|------|------|------|---------|
| 单元 | export service | `npm test -- export` | US-1 |
| 集成 | API + 队列 | `npm run test:integration` | US-1 |
| E2E | 可选 | `npx playwright test` | US-2 |

### 2. 实际运行（必须）

对 Plan 中**每条命令**在本机或 CI 执行，记录：

| 命令 | 退出码 | 时间 | 备注 |
|------|--------|------|------|
| `npm test` | 0 | 2026-06-05 | 见 CI #123 |

附 CI URL 或终端摘要（非空口承诺）。

### 3. AC 映射

```markdown
## AC Coverage
| AC | 测试 / 证据 |
|----|-------------|
| US-1 Then | export-large.test.ts |
```

### 4. 复杂度附加

- **high**：complete test 后考虑 `taiyi-evolve` → `architecture-sync.md`
- 设计漂移须在 evolve 记录后再 review

### 5. 完成

`scripts/taiyi-forge.sh complete <slug> test`

## TEST.md 模板

```markdown
# TEST: <slug>

## Test Plan
...

## Execution Log
| 命令 | 退出码 | 时间 |
|------|--------|------|

## AC Coverage
...
```

## 与下游衔接

| 下游 | TEST 须提供 |
|------|-------------|
| `taiyi-review` | 可引用的证据与失败处理 |
| `taiyi-health` | 命令基线（可重叠） |
| OpenSpec sync | TEST.md → openspec 验收附件 |

## 与铁三角

- Superpowers `verification-before-completion` — **先跑再声称通过**
- CI 红灯：先修再 complete，勿改 TEST 粉饰

## 质量自检

- [ ] 每条 MVP AC 有对应用例或手动步骤
- [ ] Execution Log 含真实 exitCode
- [ ] 命令可在干净环境复现（或注明前提）
- [ ] 与 REQUIREMENT Traceability 一致

## 禁止

- 未跑测试写「已通过」
- TEST 与 AC 无映射
- 只贴「我觉得 OK」无命令
- 伪造退出码或日期
