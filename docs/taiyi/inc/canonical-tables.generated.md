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
