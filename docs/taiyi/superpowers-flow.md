# Superpowers 主轴流程

> TaiyiForge 九阶段由 **Superpowers 全技能**驱动；**gstack / OpenSpec / web-quality-skills** 等为可选外挂。  
> **要跑通全部开源工具**：见 [**full-oss-flow.md**](./full-oss-flow.md) · `/taiyi:full-flow`  
> **单一真源**：[`workflow-manifest.yaml`](./workflow-manifest.yaml)

## 斜杠命令速查

| 命令 | 用途 |
|------|------|
| `/taiyi:flow` | 本流程总览 + 当前阶段该用哪些 Superpowers |
| `/taiyi:new` | 新建变更 |
| `/taiyi:status` | 阶段 + **Superpowers 推荐** + 工件状态 |
| `/taiyi:explore` | → `brainstorming` |
| `/taiyi:tdd plan` | task → `writing-plans` + `test-driven-development` |
| `/taiyi:tdd dev` | dev → `test-driven-development` |
| `/taiyi:apply` | dev/test 实现 |
| `/taiyi:check` | auto 模式 harness 清单 |
| `/taiyi:continue` | 过关当前阶段 |
| `/taiyi:health` | review 前（taiyi-health 辅助） |
| `/taiyi:review-loop` | → `requesting-code-review` 循环 |
| `/taiyi:audit` | integration 交付预检 |
| `/taiyi:archive` | 归档 |

写工件仍用 **taiyi-change … taiyi-integration** Skill（聊天加载，非斜杠）。

---

## Superpowers 14 技能 × 九阶段

| Superpowers Skill | 阶段 | auto 打卡 |
|-------------------|------|-----------|
| **brainstorming** | change | 必选 |
| writing-plans | requirement（可选）· **task 必选** | task 必选 |
| using-git-worktrees | change/task/dev（可选） | 可选 |
| **test-driven-development** | **task · dev** | 必选 |
| subagent-driven-development | dev（可选） | 可选 |
| dispatching-parallel-agents | dev（可选） | 可选 |
| executing-plans | task/dev（可选） | 可选 |
| **verification-before-completion** | **test · integration** | test 必选 |
| systematic-debugging | test/dev（可选） | 可选 |
| **requesting-code-review** | **review** | 必选 |
| receiving-code-review | review（可选） | 可选 |
| **finishing-a-development-branch** | **integration** | 必选 |
| using-superpowers | 任意（元） | — |
| writing-skills | 维护 Skill（元） | — |

---

## 九阶段串联（只用斜杠 + Superpowers）

```text
/taiyi:flow
/taiyi:new 功能名

① change
   /taiyi:explore → brainstorming
   → taiyi-change → /taiyi:check → /taiyi:continue

② requirement
   → taiyi-requirement（可选 writing-plans）
   → /taiyi:continue

③ design
   → taiyi-design（可选 gstack plan-eng-review）
   → /taiyi:continue

④ ui-design
   → taiyi-ui-design（可选 web-quality accessibility）
   → /taiyi:continue

⑤ task
   /taiyi:tdd plan → writing-plans + test-driven-development
   → taiyi-task → /taiyi:check → /taiyi:continue

⑥ dev
   /taiyi:tdd dev → test-driven-development
   （可选 subagent / parallel / worktrees）
   /taiyi:apply → npm test → .dev-complete
   → /taiyi:check → /taiyi:continue

⑦ test
   verification-before-completion
   /taiyi:apply → taiyi-test → /taiyi:continue

⑧ review
   /taiyi:health（medium/high）
   requesting-code-review → /taiyi:review-loop
   → /taiyi:continue

⑨ integration
   finishing-a-development-branch + verification-before-completion
   → git commit → /taiyi:audit → /taiyi:continue

/taiyi:archive
```

---

## 可选外部开源 Skill / CLI

主轴只用 **Superpowers 14 技能**；下列为**可选外挂**（`workflow-manifest.yaml` → `external_skills`，各阶段 `harness` 标 `optional: true` 不阻塞过关）。

| 来源 | Skill / CLI | 阶段 |
|------|-------------|------|
| **gstack** | plan-eng-review | design |
| **gstack** | plan-design-review | ui-design |
| **gstack** | qa | test |
| **gstack** | review | review |
| **gstack** | document-release | integration |
| **OpenSpec** | change show / archive | requirement · integration |
| **web-quality-skills** | accessibility · web-design-guidelines | ui-design · test |
| **Playwright** | `npx playwright test` | test（E2E） |
| **Semgrep** | `semgrep scan --config auto` | review（SAST） |
| **Trivy** | `trivy fs .` | review（漏洞） |
| **Changesets** | 版本发布 | integration |

安装核心 Skill 包：`npx taiyi-forge-install --all`  
CLI 工具按项目需要单独安装（见 `workflow-manifest.yaml` → `external_skills`）。

---

## 与 TaiyiForge 引擎

| 引擎能力 | 说明 |
|----------|------|
| 九阶段工件 | `.taiyi/changes/<slug>/` |
| `.dev-complete` | `command:` + `exitCode: 0` |
| delivery-gate | integration 前 commit + 干净工作区 |
| taiyi-health | medium/high review 前 |

详见 [tdd-workflow.md](./tdd-workflow.md) · [integrations.md](./integrations.md)
