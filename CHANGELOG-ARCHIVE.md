
## Archived at 2026-06-24

<!-- taiyi:engine-evidence-check --> 2026-06-17
# CHANGELOG: engine-evidence-check — 5 修引擎 evidence/trailer/debounce

## Added

- feat(evidence): Artifact validator 强校验 change/requirement/test 三阶段 AC is_checked=true 必配 evidence{command,
  exitCode:0, capturedAt}
- feat(schema): ChangeSchema/RequirementSchema/TestSchema 加 evidence? 字段(共享 EvidenceSchema)
- feat(debounce): status 命令 5s 防抖,TAIYI_STATUS_DEBOUNCE=0 关闭

## Changed

- refactor(trailer): commitTrailersEnabled() 显式默认 true,删 project config bypass
- docs(delivery): delivery-gate hint 加 trailer 模板 + /taiyi:commit <slug> 推荐

## Fixed

- fix(evidence): 阻止 AC 全勾但实测走样的"假过门"(evidence 缺失 → qualityReady=false)
- fix(trailer): 阻止 project config 的 commitTrailers: false 绕过 trailer 校验

## Tests

- test: 新增 tests/artifact-validator.test.ts 6 条单测
- test: 新增 tests/commit-trailer.test.ts 2 条单测
- test: 升级 src/core/e2e-fixtures.ts 加 evidence 字段(change/requirement/test 3 个 fixture)
- test: 调整 tests/project-config.test.ts 期望值(S2 行为变化)

## Rollback

```bash
git revert 6a8d36a 62a7ac5 a5c9c20 4b0fbc3 0f83be8
# 或
git reset --hard 267734f  # 回到 5 修前
```

回滚影响:5 commit 是顺序依赖,revert 顺序需倒序(最新先 revert)。

## Archived at 2026-06-24

<!-- taiyi:fix-shell-whitelist-and-profile-help --> 2026-06-21
# CHANGELOG: fix-shell-whitelist-and-profile-help

## Added

- feat(shell): 10 个 node CLI 支持的命令加到 shell 白名单(flow / service / mvp / micro / nano / design-system / devops /
  ci-scenario / chat / code-review),用户 `taiyi-forge.sh flow mvp` 不再报 unknown command
- docs(help): 3 处 profile help 从 `api|lite` 改为 7 profile 全列(full/lite|api|micro|nano|spike|ui)

## Changed

- dist/cli/taiyi.js 第 35 行 (init)
- dist/cli/taiyi.js 第 56 行 (walkthrough)
- dist/cli/taiyi.js 第 478 行 (new)
- scripts/taiyi-forge.sh 第 166 行 (case 白名单)

## Fixed

- 修复「白名单 + help 不全」两个 UX 问题,共 4 处小改动

## Docs / Skills

- [x] 不涉及对外协议 / 模板 / Skill 改动
- [x] 不涉及 OpenSpec(项目未 init openspec)

## Rollback

```bash
cd /Users/shixiaocai/Desktop/chuangye/oh-my-taiyiforge
git checkout main -- scripts/taiyi-forge.sh dist/cli/taiyi.js
# 或
/taiyi:cancel fix-shell-whitelist-and-profile-help --remove-dir
```

回滚影响:仅 2 文件 4 行改动,无 schema 变更。

<!-- taiyi:devops-setup --> 2026-06-24
# CHANGELOG: devops-setup

## Added

- Dockerfile for backend Python service
- docker-compose.yml with backend service
- Makefile with dev/test/lint/clean targets
- .env.example for environment config

## Changed

-

## Fixed

-

## Docs

- [ ] README / AGENTS.md synced
- [ ] OpenSpec archived

## Rollback

-
