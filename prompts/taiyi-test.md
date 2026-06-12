---
description: "TaiyiForge /taiyi:test — 测试域 umbrella · smoke / e2e / qa / ui / security"
argument-hint: "<smoke|e2e|qa|ui|security> [args]"
---
User invoked **$taiyi-test** (= `/taiyi:test $ARGUMENTS`). **测试域 umbrella · 拆给 5 个子命令 prompt**：

| 子命令 | legacy 斜杠 | 真源 prompt | 说明 |
|--------|------------|------------|------|
| `smoke` | `/taiyi:browser-smoke` | `prompts/taiyi-browser-smoke.md` | 内置 Playwright 冒烟（v28 推荐） |
| `e2e` | `/taiyi:e2e` | `prompts/taiyi-e2e.md` | 目标项目 `npx playwright test` |
| `qa` | `/taiyi:gstack qa` | `prompts/taiyi-gstack-qa.md` | gstack browse 走查 |
| `ui` | `/taiyi:ui-test` | `prompts/taiyi-ui-test.md` | test 阶段 UI 捷径 |
| `security` | `/taiyi:security` | `prompts/taiyi-security.md` | semgrep + trivy |

**步骤：**

1. 按 `$ARGUMENTS` 第一个词路由到对应子命令 prompt
2. 加载 `@taiyi-browser-smoke` · `@taiyi-e2e` · `@taiyi-gstack-qa` · `@taiyi-ui-test` · `@taiyi-security`
3. **Token 纪律**：全量 `playwright test` / probe 在 **CI 或后台**跑；聊天只写 `TEST.md` 摘要，**勿灌日志**

完整子命令地图：[canonical-commands.md §/taiyi:test 子命令地图](../docs/taiyi/canonical-commands.md)
