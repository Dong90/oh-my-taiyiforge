---
description: "TaiyiForge /taiyi:test — 测试域 umbrella · smoke / e2e / qa / ui / security"
argument-hint: "<smoke|e2e|qa|ui|security> [args]"
---
User invoked **$taiyi-test** (= `/taiyi:test $ARGUMENTS`). **测试域 umbrella · 按第一个词路由**：

| 子命令 | 说明 |
|--------|------|
| `smoke` | 内置 Playwright 冒烟（core/browser-smoke.ts） |
| `e2e` | 目标项目 `npx playwright test` |
| `qa` | gstack browse 走查 `/taiyi:gstack qa` |
| `ui` | test 阶段 UI 捷径 |
| `security` | semgrep + trivy 扫描 |

**步骤：**

1. 按 `$ARGUMENTS` 第一个词路由：`smoke` → browser-smoke · `e2e` → playwright · `qa` → gstack · `ui` → 阶段 UI · `security` → 安全扫描
2. **Token 纪律**：全量 `playwright test` / probe 在 **CI 或后台**跑；聊天只写 `TEST.md` 摘要，**勿灌日志**

完整子命令地图：[canonical-commands.md §/taiyi:test 子命令地图](../docs/taiyi/canonical-commands.md)
