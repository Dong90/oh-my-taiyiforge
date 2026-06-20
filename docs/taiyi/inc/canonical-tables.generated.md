<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## v28 主链（6）

| 意图 | 推荐斜杠 | 说明 |
|------|----------|------|
| 新建变更 | `/taiyi:new <标题>` | 创建变更目录、**默认手动**九阶段、仅铺 CHANGE.md 模板（对标 opsx:new） |
| 看进度 | `/taiyi:status` | Agent 默认 `status --json --compact`；人类可读用无前缀 status |
| 写当前阶段工件 | `/taiyi:write` | 引擎输出应加载的 `@taiyi-*` Skill |
| 过关 | `/taiyi:continue` | 尝试 complete 当前阶段；失败则输出 next 指引（对标 opsx:continue） |
| dev/test 实现清单 | `/taiyi:apply` | 仅 dev/test：打印实现 harness 清单（对标 opsx:apply） |
| 归档 | `/taiyi:archive` | integration 阶段完成后归档（对标 opsx:archive） |

## v28 会话（4）

| 意图 | 推荐斜杠 |
|------|----------|
| 暂停 | `/taiyi:handoff` |
| 恢复 | `/taiyi:resume` |
| 放弃变更 | `/taiyi:cancel` |
| 多变更列表 | `/taiyi:list` |

## v28 排查（3）

| 意图 | 推荐斜杠 |
|------|----------|
| 安装自检 | `/taiyi:doctor`（Agent `doctor --json --compact`） |
| 流程/交付排查 | `/taiyi:audit`（Agent `audit --json --compact`） |
| PR/CI 工件门禁 | `/taiyi:verify` |

## v28 交付（4）

| 意图 | 推荐斜杠 |
|------|----------|
| 带 trailer 提交 | `/taiyi:commit` |
| 创建 PR | `/taiyi:ship` |
| 合并部署 | `/taiyi:land` |
| 文档/CHANGELOG | `/taiyi:release` |

## v28 路由与捷径

| 分组 | 斜杠 |
|------|------|
| 外挂 | `/taiyi:gstack <skill>` · `/taiyi:sp <skill>` |
| 阶段 | `/taiyi:explore` · `/taiyi:tdd plan|dev` · `/taiyi:flow` |

## v28 伞形命令（6）

| 域 | 斜杠 |
|----|------|
| Token | `/taiyi:token status|record|scan|compress` |
| 测试 | `/taiyi:test smoke|e2e|qa|ui|security` |
| Review | `/taiyi:review loop|check|health|gstack` |
| 架构图 | `/taiyi:diagram pipeline|c4|arch|render|flow` |
| 多 Agent / OMC | `/taiyi:mode ralph|autopilot|…` |
| 工作流扩展 | `/taiyi:workflow plan|loop|sync|…` |

## 场景（legacy → flow）

| 旧斜杠 | v28 入口 |
|--------|----------|

列表/清理：`list --archived` · `list --all` · `prune --aborted`（CLI，无独立顶栏）。

