<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## 浏览器 / E2E

Token 纪律：全量 `playwright test` / probe 在 **CI 或后台**跑；聊天只写 TEST.md 摘要，勿灌日志。

| 斜杠 | 引擎 | 说明 |
|------|------|------|
| `/taiyi:test smoke` | `browser-smoke` | 内置 Playwright 冒烟（v28 伞形 `test smoke`） |
| `/taiyi:test e2e` | （聊天） | 目标项目 `npx playwright test`（v28 伞形 `test e2e`） |
| `/taiyi:test qa` | （聊天） | gstack browse 走查（v28 伞形 `test qa`） |
| `/taiyi:test ui` | （聊天） | test 阶段 UI QA（v28 伞形 `test ui`） |

