---
description: "TaiyiForge /taiyi:help — 全量斜杠目录（slash_catalog 真源）"
argument-hint: "[optional topic: scenarios|delivery|autonomous|gstack|superpowers|canonical|engine]"
---
User invoked **$taiyi-help** (= `/taiyi:help`)。**输出下方全量斜杠目录**（真源：`docs/taiyi/commands.yaml` → `slash_catalog` · `engine_slash` · `delivery_gstack`）。

**Cursor 输入**：文档写 `/taiyi:xxx`；Cursor `/` 菜单用 **`/taiyi-xxx`**（连字符，无冒号）。例：`/taiyi:browser-smoke` → `/taiyi-browser-smoke`。

若 `$ARGUMENTS` 为 `scenarios` | `delivery` | `autonomous` | `gstack` | `superpowers` | `canonical` | `engine`，**只展开对应节**；否则 **完整输出下列全部节** + 建议 `/taiyi:status`。

---

## 1. 主流程（core）

| 斜杠 | 用途 |
|------|------|
| `/taiyi:new <标题>` | 新建变更 |
| `/taiyi:status [slug]` | 阶段进度与下一步 |
| `/taiyi:write [slug]` | 写**当前阶段**工件（九阶段统一入口） |
| `/taiyi:continue [slug]` | 过关当前阶段 |
| `/taiyi:apply [slug]` | dev/test 实现 harness 清单 |
| `/taiyi:archive [slug]` | integration 后归档 |

## 2. 场景捷径（scenarios）

| 斜杠 | 用途 |
|------|------|
| `/taiyi:feature [标题或slug]` | 新功能 full 九阶段剧本 |
| `/taiyi:bug [描述或slug] [--create]` | 修 bug（lite 五阶段）；**`--create` 才自动 new slug** |
| `/taiyi:ui-test [slug]` | test 阶段 UI QA（gstack qa + e2e） |

## 3. 会话与排查

| 斜杠 | 用途 |
|------|------|
| `/taiyi:handoff [slug] [note]` | 暂停，写 HANDOFF |
| `/taiyi:resume [slug]` | 读 HANDOFF 恢复 |
| `/taiyi:cancel [slug]` | 放弃变更 |
| `/taiyi:list [--all] [--archived]` | 默认仅活跃；`--archived` 仅 archive/；`--all --archived` 合并 |
| `/taiyi:prune [--aborted]` | 清理孤儿 runtime；`--aborted` 删已取消变更 |
| `/taiyi:doctor` | 四端安装自检 |
| `/taiyi:audit [slug]` | 流程/交付漂移排查 |
| `/taiyi:verify [slug]` | PR/CI 工件门禁 |
| `/taiyi:health [slug]` | health 协议（须 Skill 写 report） |
| `/taiyi:check [slug]` | auto harness 清单 |
| `/taiyi:sync [slug]` | 同步 OpenSpec |
| `/taiyi:run` | onboarding（doctor+init，非九阶段 E2E） |
| `/taiyi:loop [slug] [xN]` | 循环 continue（人工门硬阻塞） |

## 4. 架构图

| 斜杠 | 用途 |
|------|------|
| `/taiyi:diagram-pipeline [slug]` | C4 → arch → render 三步 |
| `/taiyi:diagram-c4 [slug]` | 流水线 Step 1：C4 真源 |
| `/taiyi:diagram-arch [slug]` | 流水线 Step 2：architecture.md |
| `/taiyi:diagram-flow [slug]` | 业务流程 / AC 追溯 |
| `/taiyi:diagram-render [slug]` | 流水线 Step 3：Mermaid → SVG |

## 5. 自主编排（OMC）

| 斜杠 | 引擎 | 用途 |
|------|------|------|
| `/taiyi:ralph [slug]` | ralph | 验证不过修到绿 |
| `/taiyi:autopilot [slug]` | autopilot | 九阶段全自动（须 `--auto`） |
| `/taiyi:daemon run <slug>` | daemon | 无人闭环（引擎 + 外部 Agent CLI） |
| `/taiyi:team [slug]` | team | plan→exec→verify→fix |
| `/taiyi:ultrawork [slug]` | ultrawork | TASK 切片并行 |
| `/taiyi:agent <role\|list> [slug]` | agent | 专 Agent 角色 |
| `/taiyi:step [slug]` | step | 单步驱动 |
| `/taiyi:stop-mode [slug]` | stop-mode | 停止活跃模式 |
| `/taiyi:modes` | modes | 列出 `*-mode.json` |
| `/taiyi:keyword <text>` | keyword | 口头词 → 斜杠 |
| `/taiyi:preflight` | — | Codex 无 hook 时纪律 |
| `/taiyi:plan [slug]` | plan | 规划 workflow |
| `/taiyi:ralplan [slug]` | ralplan | ralph 前门禁 |
| `/taiyi:ultraqa [slug]` | ultraqa | 深度 QA 模式 |
| `/taiyi:ccg [slug]` | ccg | CCG workflow |
| `/taiyi:sciomc [slug]` | sciomc | SciOMC workflow |
| `/taiyi:deepinit [slug]` | deepinit | 深度初始化 |
| `/taiyi:external-context [slug]` | external-context | 外部上下文 |
| `/taiyi:remember [note]` | remember | 项目记忆 |
| `/taiyi:deep-interview [slug]` | — | 深度访谈 |
| `/taiyi:visual-verdict [slug]` | — | 视觉裁决 |
| `/taiyi:ai-slop-cleaner [slug]` | — | AI slop 清理 |
| `/taiyi:ecomode [slug]` | — | 省 Token 模式 |

## 6. Review / Token

| 斜杠 | 用途 |
|------|------|
| `/taiyi:review-loop [slug]` | REVIEW.md 机器循环 |
| `/taiyi:review-check <slug>` | 单次 review 门禁 |
| `/taiyi:token status [slug]` | Token 用量/预算 |
| `/taiyi:token record <slug> <n>` | 上报 Token |
| `/taiyi:token scan <slug>` | 扫描工件 Token |
| `/taiyi:token compress <slug>` | 压缩 → CONTEXT-COMPACT |

## 7. 交付链（delivery_gstack）

| 斜杠 | 用途 |
|------|------|
| `/taiyi:commit [slug] [subject]` | 提交 + trailers |
| `/taiyi:ship` | 开 PR（gstack ship） |
| `/taiyi:land` | 合并部署 |
| `/taiyi:release` | 文档同步发版 |
| `/taiyi:gstack review` | PR 预检 |
| `/taiyi:gstack qa` | 站点浏览器 QA |

## 8. 质量 / 测试

| 斜杠 | 用途 |
|------|------|
| `/taiyi:security [slug]` | semgrep + trivy |
| `/taiyi:e2e [slug]` | 项目 Playwright |
| `/taiyi:browser-smoke [--json]` | 内置 Playwright 冒烟 |

## 9. 外挂 / 流程总览

| 斜杠 | 用途 |
|------|------|
| `/taiyi:gstack <skill>` | 任意 gstack |
| `/taiyi:sp <skill>` | 任意 Superpowers |
| `/taiyi:explore` | change 头脑风暴 |
| `/taiyi:flow [slug]` | Superpowers 九阶段总览 |
| `/taiyi:full-flow [slug]` | 全开源 Skill 串联 |
| `/taiyi:tdd plan\|dev [slug]` | TDD 纪律入口 |
| `/taiyi:help [topic]` | 本目录 |

## 10. 引擎斜杠（脚本/CI · 均有 prompt）

| 斜杠 | 引擎 |
|------|------|
| `/taiyi:init <slug>` | `taiyi-forge.sh init` |
| `/taiyi:complete <slug> <phase>` | `taiyi-forge.sh complete` |
| `/taiyi:phases` | 列出阶段定义 |
| `/taiyi:mark-aux <slug> <skill>` | harness 辅助打卡 |
| `/taiyi:assess <slug>` | 复杂度评估 |
| `/taiyi:harness-check <slug> <key>` | 单项 harness 检查 |
| `/taiyi:ci platform <端>` | 四端 CI 探测 |
| `/taiyi:ci prompt <slug>` | 生成 CI Agent prompt |

## 已合并（勿用旧斜杠）

`pause`→handoff · `commit-trailers`→commit · `state`→status · `next`/`done`→continue · `change`…`integration`→**write**

## CLI vs 斜杠

| 类型 | 示例 | 说明 |
|------|------|------|
| 引擎 CLI + wrapper | `list [--archived]` · `prune` · `harness` · `token compress` · `doctor` | `./scripts/taiyi-forge.sh` 或 `npx taiyi`；`smoke-reset` **仅 wrapper** |
| 仅聊天斜杠 | `explore` · `flow` · `tdd` · `security` · `e2e` · `ui-test` · `release` · `ship` · `land` | CLI **exit 2**，须在 IDE 用 `/taiyi:<verb>` 加载 Skill |
| Legacy 别名 | `ls`→list · `check`→harness · `pause`→handoff | wrapper 与直连 CLI 均支持 |

## 后缀 xN

多数命令支持 `xN` / `--times N`（如 `/taiyi:continue x3`）；`complete` / `mark-aux` / `harness-check` 等须显式参数，不支持 xN。

## 更多

- 叙事版：`docs/taiyi/canonical-commands.md`
- 机器真源：`docs/taiyi/commands.yaml`

{{TAIYI_STAGE_PROTOCOL}}
