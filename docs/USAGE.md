# TaiyiForge 用法指南（v30）

> 从场景出发，不背命令。**聊天顶栏 21 条**（主链 6 + 会话 4 + 排查 2 + 交付 3 + 项目 1 + 伞形 5），其余走引擎 CLI 或伞形子参数。

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

**场景快速路由**（引擎 CLI `flow` 替代旧 `/taiyi:flow`）：

```bash
# 顶栏：/taiyi:plan 是项目级规划入口
/taiyi:plan README.md          # 拆解 + 推荐 profile + 批量 /taiyi:new

# 单 change 4 阶段 MVP：引擎 CLI（顶栏不暴露 flow mvp）
scripts/taiyi-forge.sh flow mvp <slug>      # 4 阶段 lite
scripts/taiyi-forge.sh flow micro <slug>    # 3 阶段
scripts/taiyi-forge.sh flow nano <slug>     # 2 阶段
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
/taiyi:skill tdd plan           # TDD 测试计划（原 /taiyi:tdd plan）
/taiyi:skill tdd dev            # 红→绿→重构循环（原 /taiyi:tdd dev）
/taiyi:skill flow ralph         # 死磕：自动跑 npm test 直到全绿（原 /taiyi:mode ralph）
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
/taiyi:skill gstack review      # PR diff 审查（原 /taiyi:gstack review）
/taiyi:ship                     # 推送 + 创建 PR
/taiyi:land                     # 合并 + 部署 + canary

/taiyi:continue integration     # 引擎过 integration
/taiyi:archive                  # 归档
```

> `/taiyi:release` 已从顶栏移除（合并入 `land` 或伞形 `/taiyi:skill gstack document-release`）。

---

## 场景速查

### 新功能（full）
```
/taiyi:new "用户登录"
/taiyi:skill explore → write → continue --approver "张三"    # change（原 /taiyi:explore）
write → continue                                              # requirement
write → /taiyi:diagram c4 → continue --approver "张三"        # design
write → continue                                              # ui-design
write → /taiyi:skill tdd plan → continue                      # task
/taiyi:skill tdd dev → /taiyi:skill flow ralph → continue     # dev
/taiyi:test smoke → write → continue                          # test
/taiyi:review loop → /taiyi:review health → continue --approver  # review
/taiyi:commit → verify → ship → land                          # 交付
/taiyi:continue integration → archive
```

### Bug 修复（lite）
```
/taiyi:new "修导出超时" --profile lite
write → continue --approver "张三"    # change
write → continue                     # requirement
# 跳过 design / ui-design / task / review
/taiyi:skill tdd dev → continue      # dev
/taiyi:test smoke → write → continue # test
/taiyi:commit → continue integration → archive
```

### 创业 MVP（spike）
```
/taiyi:new "mvp-onboarding" --profile spike
write → continue --approver     # change（动机 + 成功标准）
# 跳过 requirement / design / ui-design / task / review
/taiyi:skill tdd dev → continue # dev
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
write → /taiyi:skill tdd plan → continue   # task
/taiyi:skill tdd dev → /taiyi:skill flow ralph → continue
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
write → /taiyi:skill flow restyle → continue    # ui-design（restyle 辅助）
write → /taiyi:skill tdd plan → continue   # task
/taiyi:skill tdd dev → continue        # dev
/taiyi:test ui → /taiyi:test smoke → write → continue  # test
/taiyi:skill gstack design-review → /taiyi:review loop → continue --approver
/taiyi:commit → ship → land → continue integration → archive
```

### 极简改动（nano）
```
/taiyi:new "hotfix" --profile nano
/taiyi:skill tdd dev → continue       # dev（创建 .dev-complete）
continue integration → archive
# 零文档，dev 直起，TAIYI_SKIP_QUALITY_GATE=1 可跳过门禁
```

---

## 伞形命令（v30 顶栏 · 5 条）

> 已砍掉 `/taiyi:mode` `/taiyi:workflow` `/taiyi:explore` `/taiyi:flow` `/taiyi:tdd` `/taiyi:gstack` `/taiyi:sp` 7 个独立伞形；功能合并入 `/taiyi:skill <name>` 单一伞形 + 引擎 CLI。

### `/taiyi:skill <name>` — 外部 Skill 路由

```
/taiyi:skill gstack <name>        # gstack 任意 Skill：review · qa · design-shotgun · autoplan · canary · design-review
/taiyi:skill sp <name>            # Superpowers 任意 Skill：brainstorming · test-driven-development · writing-plans · verification
/taiyi:skill explore              # 头脑风暴（同 brainstorming）
/taiyi:skill tdd plan|dev         # TDD 红绿重构（plan=测试计划，dev=红→绿→重构）
/taiyi:skill flow <verb>          # 全工具链剧本：ralph · autopilot · team · ultrawork · agent · step · stop · restyle …
/taiyi:skill flow mvp|micro|nano  # lite 路径（短流程剧本）
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
/taiyi:pause             # 暂停工作，写 HANDOFF.md
/taiyi:pause --resume    # 恢复工作（从 HANDOFF.md）
/taiyi:cancel <slug>     # 放弃变更
```

### Legacy（已从顶栏移除 · 引擎 CLI 仍可用）

```bash
scripts/taiyi-forge.sh doctor              # 安装自检（四端 skills + CLI）
scripts/taiyi-forge.sh audit               # 流程排查（漂移、交付未闭环）
scripts/taiyi-forge.sh health              # 代码健康报告
scripts/taiyi-forge.sh release             # 文档发布
scripts/taiyi-forge.sh plan <file>         # = /taiyi:plan（聊天等价）
scripts/taiyi-forge.sh ralph|autopilot|... # = /taiyi:skill flow <verb>
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

**新建 `/taiyi:new`（项目级先 `/taiyi:plan`），写 `/taiyi:write`，过 `/taiyi:continue`，停 `/taiyi:pause`，交 `/taiyi:commit → ship → land → archive`。**
