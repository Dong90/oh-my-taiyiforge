# browser-e2e-smoke — `/taiyi:browser-smoke` 内置夹具

最小静态页 + Playwright。聊天斜杠 **`/taiyi:browser-smoke`**，引擎 **`taiyi-forge.sh browser-smoke`**。

## 一键验证

```bash
/taiyi:browser-smoke          # 聊天：Agent 代跑
scripts/taiyi-forge.sh browser-smoke
node examples/browser-e2e-smoke/run-verify.mjs
```

## 与 TaiyiForge 斜杠对齐

| 步骤 | 斜杠 / 命令 | 本夹具 |
|------|-------------|--------|
| 1 | `/taiyi:status [slug]` | （可选）确认在 test 阶段 |
| 2 | `/taiyi:gstack qa` | 浏览器走查：可用 gstack `browse` 打开 `index.html` |
| 3 | `/taiyi:e2e` | `npx playwright test`（本目录） |
| 4 | 证据 | 将 exit code + 摘要写入变更 `TEST.md` |
| 5 | `/taiyi:continue` | 引擎过关 |

 bundled 捷径：`/taiyi:ui-test` = gstack qa + e2e + verification-before-completion。

## 手动

```bash
cd examples/browser-e2e-smoke
npm install
npx playwright install chromium
npm test
```
