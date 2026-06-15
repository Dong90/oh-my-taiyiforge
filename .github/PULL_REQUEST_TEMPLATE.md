> ⚠️ **base 分支必须是 `develop`**（不是 `main`）。点 GitHub PR 页面顶部的 `base:` 切换。
> main 由维护者定期从 develop 合入并发版，外部 PR 直接打到 main 会被关闭。

## 变更说明

<!-- 一句话说清改了什么 / 为什么 -->

## 关联

- 关联 Issue: #
- 关联 `taiyi` 变更（slug）: <!-- 例：my-first -->

## 阶段

<!-- 跑过哪几阶段就勾哪几个 -->
- [ ] change → REQUIREMENT → design
- [ ] task → dev (TDD)
- [ ] test → review
- [ ] integration

## 验证

- [ ] `npm test` 跑通
- [ ] `npm run check:docs` 跑通
- [ ] `npm run dogfood` 跑通（如适用）
- [ ] `npx taiyi doctor --strict-workspace` 跑通

## 截图 / 输出

<!-- 终端输出、截图、demo GIF -->

## Checklist

- [ ] 我读了 [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [ ] 我跑了相关 Skill（change / dev / test / review）
- [ ] 我给 commit 加了 `Taiyi-Change: <slug>` trailer（如适用）
