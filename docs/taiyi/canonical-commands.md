# TaiyiForge 推荐斜杠（canonical v30）

真源：`docs/taiyi/commands.yaml` → **`canonical_v30`** · `slash_catalog.recommended_v30`

**generated 表格**：`npm run generate:docs` → `prompts/inc/slash-catalog.generated.md` + 本节标记块（`docs/taiyi/inc/*.generated.md`）

**原则**：聊天推荐 21 条顶栏；引擎能力保留。


<!-- BEGIN GENERATED canonical-tables -->

<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## v30 主链（6）

| 意图 | 推荐斜杠 | 说明 |
|------|----------|------|
| 新建变更 | `/taiyi:new <标题>` | 创建变更目录、**默认手动**九阶段、seed **change.json + CHANGE.md**（对标 opsx:new） |
| 看进度 | `/taiyi:status` | Agent 默认 `status --json --compact`；人类可读用无前缀 status |
| 写当前阶段工件 | `/taiyi:write` | 引擎输出应加载的 `@taiyi-*` Skill |
| 过关 | `/taiyi:continue` | 过关当前阶段（引擎内部调用 complete；聊天统一称 continue） |
| dev/test 实现清单 | `/taiyi:apply` | 仅 dev/test：打印实现 harness 清单（对标 opsx:apply） |
| 归档 | `/taiyi:archive` | integration 阶段完成后归档（对标 opsx:archive） |

## v30 会话（4）

| 意图 | 推荐斜杠 |
|------|----------|
| 暂停 | `/taiyi:pause` |
| 恢复（pause --resume） | `/taiyi:pause --resume` |
| 放弃变更 | `/taiyi:cancel` |
| 多变更列表 | `/taiyi:list` |

## v30 排查（2）

| 意图 | 推荐斜杠 |
|------|----------|
| PR/CI 工件门禁 | `/taiyi:verify` |
| json → md 强制同步 | `/taiyi:render [slug] [phase]` |

## v30 交付（3）

| 意图 | 推荐斜杠 |
|------|----------|
| 带 trailer 提交 | `/taiyi:commit` |
| 创建 PR | `/taiyi:ship` |
| 合并部署 | `/taiyi:land` |

## v30 项目（1）

| 意图 | 推荐斜杠 |
|------|----------|
| 项目级规划 | `/taiyi:plan [file]`（README/PRD/PDF/URL → 多个 change） |

## v30 伞形命令（5）

| 域 | 斜杠 |
|----|------|
| 外部 Skill 路由 | `/taiyi:skill <name>`（吸收 gstack · sp · explore · tdd · flow） |
| Token | `/taiyi:token status|record|scan|compress` |
| 测试 | `/taiyi:test smoke|e2e|qa|ui|security` |
| Review | `/taiyi:review loop|check|health|gstack` |
| 架构图 | `/taiyi:diagram pipeline|c4|arch|render|flow` |

## 场景（legacy → plan）

| 旧斜杠 | v30 入口 |
|--------|----------|

列表/清理：`list --archived` · `list --all` · `prune --aborted`（CLI，无独立顶栏）。

<!-- END GENERATED canonical-tables -->

<!-- BEGIN GENERATED diagram-pipeline -->

<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## 架构图（v30 · `/taiyi:diagram`）

| v30 子命令 | 步骤 | 说明 | legacy 斜杠 |
|------------|------|------|-------------|
| `/taiyi:diagram pipeline` | ①②③ |  | `/taiyi:diagram-pipeline` |
| `/taiyi:diagram c4` | ① |  | `/taiyi:diagram-c4` |
| `/taiyi:diagram arch` | ② |  | `/taiyi:diagram-arch` |
| `/taiyi:diagram render` | ③ |  | `/taiyi:diagram-render` |
| `/taiyi:diagram flow` | — |  | `/taiyi:diagram-flow` |

详见 `docs/diagrams/pipeline.md` · `commands.yaml` → `auxiliary.commands`。

<!-- END GENERATED diagram-pipeline -->

<!-- BEGIN GENERATED delivery-chain -->

<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## 交付链（gstack）

```text
/taiyi:commit → /taiyi:verify → /taiyi:gstack review（可选）
→ /taiyi:ship → /taiyi:land → /taiyi:continue integration
→ /taiyi:archive
```

详见 [delivery-slash.md](./delivery-slash.md)。

<!-- END GENERATED delivery-chain -->

<!-- BEGIN GENERATED browser-e2e -->

<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## 浏览器 / E2E

Token 纪律：全量 `playwright test` / probe 在 **CI 或后台**跑；聊天只写 TEST.md 摘要，勿灌日志。

| 斜杠 | 引擎 | 说明 |
|------|------|------|
| `/taiyi:test smoke` | （聊天） | 内置 Playwright 冒烟（伞形 `test smoke`） |
| `/taiyi:test e2e` | （聊天） | 目标项目 `npx playwright test`（伞形 `test e2e`） |
| `/taiyi:test qa` | （聊天） | gstack browse 走查（伞形 `test qa`） |
| `/taiyi:test ui` | （聊天） | test 阶段 UI QA（伞形 `test ui`） |

<!-- END GENERATED browser-e2e -->

详见 [autonomous.md](./autonomous.md) · [omc-reference.md](./omc-reference.md)。
