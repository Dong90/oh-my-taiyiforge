<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## 浏览器 / E2E

Token 纪律：全量 `playwright test` / probe 在 **CI 或后台**跑；聊天只写 TEST.md 摘要，勿灌日志。

| 斜杠 | 引擎 | 说明 |
|------|------|------|
| `/taiyi:browser-smoke` | `browser-smoke` | 内置 Playwright 浏览器冒烟（examples/browser-e2e-smoke） |
| `/taiyi:e2e` | （聊天） | 目标项目 `npx playwright test`（Agent 代跑；摘要写 TEST.md） |
| `/taiyi:gstack qa` | （聊天） | gstack browse 走查 |
| `/taiyi:ui-test` | （聊天） | test 阶段 UI QA 捷径 |

