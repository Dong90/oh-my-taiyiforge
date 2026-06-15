---
description: "TaiyiForge /taiyi:e2e — Playwright E2E + verification evidence"
argument-hint: "[optional slug]"
---
User invoked **$taiyi-e2e** (= `/taiyi:e2e`). **E2E 测试**（**test** 阶段；项目须已装 `@playwright/test`）。

**Token 纪律：勿在对话里跑全量 Playwright。** 在 CI 或后台终端执行，聊天只接收摘要并写入 TEST.md。

1. `/taiyi:status [slug]` — 确认在 test 或 dev 已完成
2. **后台 / CI** 运行（勿把完整日志贴进聊天）：
   ```bash
   npx playwright test
   ```
3. 加载 **Superpowers `verification-before-completion`** — 无通过输出不得声称 E2E 完成
4. 证据（命令 + exit code + 摘要）写入 **TEST.md**
5. 可选：`/taiyi:gstack qa` — 浏览器走查补充 UI 证据（同样后台跑，对话只写摘要）
6. 本仓库内置冒烟：`/taiyi:browser-smoke` — **CI/后台** `taiyi-forge.sh browser-smoke`
7. `/taiyi:continue`

未装 Playwright：报告安装步骤（`npm i -D @playwright/test` · `npx playwright install`），勿伪造通过。

{{TAIYI_STAGE_PROTOCOL}}

{{SUPERPOWERS_INVOKE}}
