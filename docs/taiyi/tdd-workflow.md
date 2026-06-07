# TDD 工作流（TaiyiForge + Superpowers）

> **测试先行**贯穿 task → dev → test；引擎用 `.dev-complete` 强制可复现证据，聊天用 Superpowers 强制红绿重构纪律。

## 三阶段分工

| 阶段 | 做什么 | 产出 | Superpowers |
|------|--------|------|-------------|
| **task** | 每个切片写清「先写什么失败测试、验收命令」 | TASK.md Slices + Checklist | `test-driven-development`（**计划模式**） |
| **dev** | 按切片 RED → GREEN → REFACTOR | 代码 + `.dev-complete` | `test-driven-development`（**执行模式**） |
| **test** | 汇总计划、执行记录、回归范围 | TEST.md | `verification-before-completion` |

lite profile 无 task：在 **requirement AC** 上逐项 TDD，仍走 dev + test。

---

## 红绿重构（dev 每切片）

```text
1. RED   — 写失败测试（或更新现有测试表达新行为）
2. GREEN — 最小实现使测试通过
3. REFACTOR — 保持测试绿的前提下整理结构
4. 勾选 TASK 对应 T* 或 AC
```

**禁止**：先写实现再补「永远为绿」的假测试。

---

## `.dev-complete` 证据（引擎强制）

过关须包含：

```text
command: npm test
exitCode: 0
dev complete
```

`--strict-dev` 额外要求首行 `strict: true`（CI/高合规项目建议 init 时开启）。

---

## 聊天命令

### `/taiyi:tdd [plan|dev] [slug]`

| 子命令 | 何时用 |
|--------|--------|
| `plan`（默认） | **task** 阶段：与 `taiyi-task` 一起定测试文件与验收命令 |
| `dev` | **dev** 阶段：加载 Superpowers TDD，按当前切片实现 |

Codex：`$taiyi-tdd` · 见 `prompts/taiyi-tdd.md`

### `/taiyi:apply`

dev/test 实现入口；内部提示加载 `taiyi-dev` + Superpowers TDD。

---

## 铁三角打卡（`--auto` 必选）

```bash
# task 完成后（计划测试策略）
scripts/taiyi-forge.sh harness-check <slug> superpowers/test-driven-development

# dev 完成后（已跑通测试）
scripts/taiyi-forge.sh harness-check <slug> superpowers/test-driven-development

# test 阶段
scripts/taiyi-forge.sh harness-check <slug> superpowers/verification-before-completion
```

dev 与 task 共用同一 Superpowers Skill 名；打卡键为 `superpowers/test-driven-development`。

---

## TASK.md 质量门（引擎）

`complete task` 时校验 TASK.md 含：

- `## Slices` 表有实质行
- **测试先行**表述（如「测试先行」「RED」「先写.*测试」或 Done when 含 `test`/`npm test`）

见 `artifact-validator.ts` · `taskHasTddPlan()`.

---

## 与 gstack / OpenSpec

| 工具 | TDD 相关 |
|------|----------|
| gstack `qa` | test 阶段站点/流程 QA（可选） |
| gstack `review` | 审查 diff 是否含测试与结构问题 |
| OpenSpec | 不改 TDD 流程；规格与 `.taiyi` 工件可 sync |

---

## 自检清单

- [ ] 每个 T* / AC 有对应测试或脚本
- [ ] `npm test`（或项目等价命令）本地 exit 0
- [ ] `.dev-complete` 与真实命令一致
- [ ] Superpowers TDD 已在 task/dev 加载并 harness-check（auto 模式）
- [ ] test 阶段有 verification-before-completion 证据
