---
description: "TaiyiForge /taiyi:browser-smoke — Playwright 浏览器 E2E 冒烟（内置夹具）"
argument-hint: "[--json]"
---
User invoked **$taiyi-browser-smoke** (= `/taiyi:browser-smoke`). **Browser E2E smoke** — 内置 Playwright 夹具，等价于完整 `/taiyi:e2e` 验证路径的可复现子集。

## Agent 代跑（勿让用户手打）

```bash
scripts/taiyi-forge.sh browser-smoke
# 或 JSON:
scripts/taiyi-forge.sh browser-smoke --json
```

等价于：`node examples/browser-e2e-smoke/run-verify.mjs`（安装 Playwright + 跑 `e2e/smoke.spec.js`）。

## 与九阶段斜杠的关系

| 斜杠 | 场景 |
|------|------|
| **`/taiyi:browser-smoke`** | 本仓库 / 已装包内的**固定冒烟**（无需目标项目 Playwright 配置） |
| **`/taiyi:e2e`** | 变更 **test** 阶段：跑**当前项目**的 `npx playwright test` |
| **`/taiyi:gstack qa`** | 浏览器走查（gstack browse） |
| **`/taiyi:ui-test`** | test 阶段捷径：gstack qa + e2e |

完整 test 阶段路径：

1. `/taiyi:status [slug]`
2. 可选 `/taiyi:gstack qa` — 打开 `examples/browser-e2e-smoke/index.html`（`python3 -m http.server`）走查
3. **`/taiyi:browser-smoke`** 或 **`/taiyi:e2e`**
4. 证据写入 **TEST.md** + Superpowers **verification-before-completion**
5. `/taiyi:continue`

无通过输出不得声称 E2E 完成。

{{TAIYI_STAGE_PROTOCOL}}

{{SUPERPOWERS_INVOKE}}
