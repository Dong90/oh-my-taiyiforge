<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## 日常主链

| 意图 | 推荐斜杠 | 说明 |
|------|----------|------|
| 新建变更 | `/taiyi:new <标题>` | 创建变更目录、**默认手动**九阶段、仅铺 CHANGE.md 模板（对标 opsx:new） |
| 看进度 | `/taiyi:status` | Agent 默认 `status --json --compact`；人类可读用无前缀 status |
| 写当前阶段工件 | `/taiyi:write` | 引擎输出应加载的 `@taiyi-*` Skill |
| 过关 | `/taiyi:continue` | 尝试 complete 当前阶段；失败则输出 next 指引（对标 opsx:continue） |
| dev/test 实现清单 | `/taiyi:apply` | 仅 dev/test：打印实现 harness 清单（对标 opsx:apply） |
| 归档 | `/taiyi:archive` | integration 阶段完成后归档（对标 opsx:archive） |

## 会话与排查

| 意图 | 推荐斜杠 |
|------|----------|
| 暂停 | `/taiyi:handoff` |
| 恢复 | `/taiyi:resume` |
| 放弃变更 | `/taiyi:cancel` |
| 多变更列表 | `/taiyi:list` |
| 仅归档列表 | CLI：`list --archived`；全量：`list --all [--archived]` |
| 清理 aborted | `prune --aborted` |
| 安装自检 | `/taiyi:doctor`（Agent `doctor --json --compact`） |
| 流程/交付排查 | `/taiyi:audit`（Agent `audit --json --compact`） |
| PR/CI 工件门禁 | `/taiyi:verify` |

## 场景捷径

| 斜杠 | 用途 |
|------|------|
| `/taiyi:feature` | 新功能 full 九阶段剧本 |
| `/taiyi:bug` | lite 五阶段修 bug |
| `/taiyi:ui-test` | test 阶段 UI QA（gstack qa + e2e） |

