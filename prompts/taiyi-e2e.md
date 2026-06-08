---
description: "TaiyiForge /taiyi:e2e — Playwright E2E + verification evidence"
argument-hint: "[optional slug]"
---
User invoked **$taiyi-e2e** (= `/taiyi:e2e`). **E2E 测试**（**test** 阶段；项目须已装 `@playwright/test`）。

1. `/taiyi:status [slug]` — 确认在 test 或 dev 已完成
2. 运行：
   ```bash
   npx playwright test
   ```
3. 加载 **Superpowers `verification-before-completion`** — 无通过输出不得声称 E2E 完成
4. 证据（命令 + exit code + 摘要）写入 **TEST.md**
5. 可选：`/taiyi:gstack qa` — 浏览器走查补充 UI 证据
6. `/taiyi:continue`

未装 Playwright：报告安装步骤（`npm i -D @playwright/test` · `npx playwright install`），勿伪造通过。

{{TAIYI_STAGE_PROTOCOL}}

{{SUPERPOWERS_INVOKE}}
