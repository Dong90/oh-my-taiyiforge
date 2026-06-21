# TaiyiForge 用法指南

> 从场景出发，不背命令。

## 一分钟决定 profile

打开 terminal，根据你在做什么选：

| 你在做什么 | 选这个 | 执行阶段 | 一句话 |
|-----------|--------|---------|--------|
| 新功能 / 大改动 | `full`（默认） | 全部 9 阶段 | 最全流程，文档齐备 |
| 后端 API / 服务 | `api` | 8 阶段 | 跳过 UI 设计 |
| 设计系统 / 组件库 | `ui` | 全部 9 阶段 | 同 full，UI 优先 harness |
| Bug 修复 | `lite` | 5 阶段 | 跳过设计+评审 |
| 创业 MVP / 快速原型 | `spike` | 4 阶段 | 只写动机+成功标准 |
| 个人小工具 | `micro` | 3 阶段 | 不写测试文档 |
| 极简改动 | `nano` | 2 阶段 | 零文档，dev 直起 |

各 profile 跳过的阶段：

| profile | 跳过 | 产出工件 |
|---------|------|----------|
| `full` | 无 | CHANGE REQUIREMENT DESIGN UI-DESIGN TASK .dev-complete TEST REVIEW health-report CHANGELOG |
| `api` | ui-design | 同上，无 UI-DESIGN |
| `ui` | 无（同 full） | 同 full，restyle + design-review 默认加载 |
| `lite` | design ui-design task review | CHANGE REQUIREMENT .dev-complete TEST CHANGELOG |
| `spike` | requirement design ui-design task review | CHANGE .dev-complete TEST CHANGELOG |
| `micro` | requirement design ui-design task test review | CHANGE .dev-complete CHANGELOG |
| `nano` | change requirement design ui-design task test review | .dev-complete CHANGELOG |

用法：`/taiyi:new "标题" --profile lite` 或在 `.taiyi/config.json` 设 `defaultProfile`。

**场景别名快速路由**（等同于指定 profile 的 `/taiyi:new`）：

```
/taiyi:feature       → full      /taiyi:service       → api
/taiyi:bug           → lite      /taiyi:design-system  → ui
/taiyi:mvp           → spike     /taiyi:flow           → 选型菜单
/taiyi:micro         → micro     /taiyi:flow devops    → CI 指引
/taiyi:nano          → nano
```

---

## 日常节奏

### 通用口诀：write → continue → write → continue...

```
/taiyi:new "功能描述"          # 创建变更
/taiyi:status                   # 看当前阶段和下一步
/taiyi:write                    # 写当前阶段工件（引擎告诉你该用哪个 Skill）
/taiyi:continue --approver "你的名字"  # 过关（人工审批阶段需要 approver）
/taiyi:write                    # 下一阶段...
/taiyi:continue
...                             # 重复到 integration
/taiyi:archive                  # 归档
```

三个阶段需要人工审批（须带 `--approver`）：
- **change** — 确认变更范围和目标
- **design** — 确认技术方案
- **review** — 确认代码质量

### dev 阶段怎么干活

dev 阶段才是真正写业务代码的时候。dev 之前的阶段只写 markdown 工件（引擎有 hook 硬拦）。流程：

```
/taiyi:tdd plan                 # TDD 测试计划
/taiyi:tdd dev                  # 红→绿→重构循环
/taiyi:mode ralph               # 死磕：自动跑 npm test 直到全绿
                                 # （写代码、写测试...）
echo "command: npm test" > .taiyi/changes/<slug>/.dev-complete
echo "exitCode: 0" >> .taiyi/changes/<slug>/.dev-complete
/taiyi:continue                 # 过关
```

### 测试阶段

```
/taiyi:test smoke               # Playwright 冒烟
/taiyi:test e2e                 # 项目 E2E
/taiyi:test qa                  # gstack QA 走查
/taiyi:write                    # 写 TEST.md 粘贴证据
/taiyi:continue
```

### 交付阶段

```
/taiyi:review loop              # 机器审查循环
/taiyi:review check             # 检查审查是否通过
/taiyi:test security            # 安全扫描（semgrep + trivy）
/taiyi:continue --approver "你的名字"

# ---- 以下走 gstack 交付链 ----
/taiyi:commit                   # 带 Taiyi-Change trailer 提交
/taiyi:verify                   # PR 工件门禁（无 LLM）
/taiyi:gstack review            # PR diff 审查
/taiyi:ship                     # 推送 + 创建 PR
/taiyi:land                     # 合并 + 部署 + canary
/taiyi:release                  # 文档发布

/taiyi:continue integration     # 引擎过 integration
/taiyi:archive                  # 归档
```

---

## 场景速查

### 新功能（full）
```
/taiyi:new "用户登录"
/taiyi:explore → write → continue --approver "张三"    # change
write → continue                                      # requirement
write → /taiyi:diagram c4 → continue --approver "张三" # design
write → continue                                      # ui-design
write → /taiyi:tdd plan → continue                    # task
/taiyi:tdd dev → /taiyi:mode ralph → continue         # dev
/taiyi:test smoke → write → continue                  # test
/taiyi:review loop → /taiyi:health → continue --approver # review
/taiyi:commit → verify → ship → land → release         # 交付
/taiyi:continue integration → archive
```

### Bug 修复（lite）
```
/taiyi:new "修导出超时" --profile lite
write → continue --approver "张三"    # change
write → continue                     # requirement
# 跳过 design / ui-design / task / review
/taiyi:tdd dev → continue            # dev
/taiyi:test smoke → write → continue # test
/taiyi:commit → continue integration → archive
```

### 创业 MVP（spike）
```
/taiyi:new "mvp-onboarding" --profile spike
write → continue --approver     # change（动机 + 成功标准）
# 跳过 requirement / design / ui-design / task / review
/taiyi:tdd dev → continue       # dev
/taiyi:test smoke → write → continue  # test
continue integration → archive
# 可设 TAIYI_DELIVERY_GATE=0 本地跳过 commit；TAIYI_SKIP_QUALITY_GATE=1 加速
```

### 后端服务（api）
```
/taiyi:new "新增用户 API" --profile api
write → continue --approver "张三"    # change
write → continue                     # requirement
write → /taiyi:diagram c4 → continue # design
# 跳过 ui-design
write → /taiyi:tdd plan → continue   # task
/taiyi:tdd dev → /taiyi:mode ralph → continue
/taiyi:test smoke → write → continue
/taiyi:review loop → /taiyi:test security → continue --approver
/taiyi:commit → ship → land → continue integration → archive
```

### 设计系统 / 组件库（ui）
```
/taiyi:new "Button 组件重构" --profile ui
write → continue --approver          # change
write → continue                     # requirement
write → /taiyi:diagram c4 → continue # design
write → /taiyi:restyle → continue    # ui-design（restyle 辅助）
write → /taiyi:tdd plan → continue   # task
/taiyi:tdd dev → continue            # dev
/taiyi:test ui → /taiyi:test smoke → write → continue  # test
/taiyi:gstack design-review → /taiyi:review loop → continue --approver
/ /taiyi:commit → ship → land → continue integration → archive
```

### 极简改动（nano）
```
/taiyi:new "hotfix" --profile nano
/taiyi:tdd dev → continue       # dev（创建 .dev-complete）
continue integration → archive
# 零文档，dev 直起，TAIYI_SKIP_QUALITY_GATE=1 可跳过门禁
```

---

## 常用伞形命令（完整子命令树）

### `/taiyi:mode` — 多 Agent 编排
```
/taiyi:mode ralph           # 死磕模式：自动跑 npm test 直到全绿
/taiyi:mode autopilot       # 全自动：AutoPlanner → Executor → Verifier
/taiyi:mode daemon          # 守候模式：持续 monitor 并自动推进
/taiyi:mode team            # 团队模式：多 Agent 并行协作
/taiyi:mode ultrawork       # 超并行：切片多 Agent 同时 dev+test
/taiyi:mode agent list      # 列出可用 Agent 角色
/taiyi:mode agent <角色>    # 启动指定 Agent 角色
/taiyi:mode step <slug>     # 单步驱动（CI/daemon 内用）
/taiyi:mode stop            # 停止所有活跃模式
/taiyi:mode list            # 列出活跃模式
/taiyi:mode keyword ralph   # 检测 OMC 关键词是否激活
/taiyi:mode preflight       # 启动前自检
```

### `/taiyi:workflow` — 工作流扩展
```
/taiyi:workflow plan          # GSD plan-phase 规划
/taiyi:workflow ralplan       # Ralph + Plan 组合
/taiyi:workflow loop          # 循环执行 continue 直到 blocked
/taiyi:workflow sync          # 同步状态 → 去僵 block
/taiyi:workflow ccg           # Codex Code Gen
/taiyi:workflow sciomc        # Scientific OMC
/taiyi:workflow deepinit      # Deep context initialization
/taiyi:workflow remember      # 持久化记忆到 project-memory.json
/taiyi:workflow ultraqa       # 并行多 Agent QA
/taiyi:workflow deep-interview # 深度需求访谈
/taiyi:workflow visual-verdict # 可视化评审
/taiyi:workflow ai-slop-cleaner # AI 产出质量清洁
/taiyi:workflow ecomode       # 经济模式（节能 token）
/taiyi:workflow external-context # 加载外部上下文
```

### `/taiyi:test` — 测试链
```
/taiyi:test smoke      # Playwright 浏览器冒烟
/taiyi:test e2e        # 项目级 E2E 测试
/taiyi:test qa         # gstack QA 全栈走查
/taiyi:test ui         # UI 专项测试
/taiyi:test security   # 安全扫描（semgrep + trivy）
```

### `/taiyi:review` — 审查链
```
/taiyi:review loop     # 机器审查循环（写 REVIEW.md → review-check → 修复 → 重审）
/taiyi:review check    # 单次审查是否通过
/taiyi:review health   # health-report.md 确认
/taiyi:review gstack   # gstack review PR diff
```

### `/taiyi:diagram` — 架构图链
```
/taiyi:diagram pipeline  # 三步流水线：c4 → arch → render 一键全出
/taiyi:diagram c4        # C4 架构图（Mermaid 真源）
/taiyi:diagram arch      # 工程架构图（基于 c4 同步）
/taiyi:diagram render    # Mermaid → PNG/SVG 渲染
/taiyi:diagram flow      # 业务流程图 / 状态机 / 序列图
```

### `/taiyi:token` — Token 管理
```
/taiyi:token status    # 当前 token 用量
/taiyi:token record    # 记录到 .token-usage.json
/taiyi:token scan      # 扫描历史用量
/taiyi:token compress  # 压缩上下文 → CONTEXT-COMPACT.md
```

---

## 辅助命令

```
/taiyi:list              # 列出所有变更及阶段
/taiyi:list --archived   # 已归档变更
/taiyi:pause           # 暂停工作，写 HANDOFF.md
/taiyi:resume            # 恢复工作
/taiyi:cancel <slug>     # 放弃变更
/taiyi:doctor            # 安装自检（四端 skills + CLI）
/taiyi:audit             # 流程排查
/taiyi:health             # 代码健康报告
/taiyi:intel-scan         # 代码库情报扫描 → CONTEXT.md
/taiyi:architect          # 架构决策记录 ADR
```

---

## 环境变量

| 变量 | 作用 | 默认 |
|------|------|------|
| `TAIYI_SKIP_QUALITY_GATE=1` | 跳过五维质量门禁 | 关 |
| `TAIYI_DELIVERY_GATE=0` | 关闭交付门（免 git commit） | 开 |
| `TAIYI_AUTO_HARNESS=1` | 全自动编排模式 | 关 |
| `TAIYI_HUMAN_GATE_PHASES` | 自定义人工审批阶段 | change,design,review |
| `TAIYI_SKIP_INTEGRATION_AUDIT=1` | 跳过 integration 审计 | 关 |
| `TAIYI_SKIP_ROOT_CHANGELOG=1` | 不同步根 CHANGELOG | 关 |
| `TAIYI_DELIVERY_VERIFY_CMD` | 交付门额外验证命令 | 无 |

## 项目配置 `.taiyi/config.json`

```json
{
  "scenario": "service",
  "defaultProfile": "api",
  "deliveryGate": true,
  "deliveryVerifyCmd": "npm run ci:verify",
  "commitTrailers": true
}
```

- `scenario`: 场景类型，见 profile 映射表
- `defaultProfile`: 默认 profile，`--profile` 可覆盖
- `deliveryGate`: 是否开启交付门（commit + 干净工作区）
- `deliveryVerifyCmd`: 交付前额外验证命令
- `commitTrailers`: 是否检查 commit 中的 `Taiyi-Change` trailer

---

## 一句话总结

**写就 `/taiyi:write`，过就 `/taiyi:continue`，停就 `/taiyi:pause`，交就 `/taiyi:commit → ship → land → archive`。**
