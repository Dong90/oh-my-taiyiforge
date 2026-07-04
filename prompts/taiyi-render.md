<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-render.md -->
---
description: "TaiyiForge /taiyi:render — json → md via hbs"
argument-hint: "optional slug and phase, e.g. change"
---
User invoked **$taiyi-render** (= `/taiyi:render`). Run:

```bash
scripts/taiyi-forge.sh render $ARGUMENTS
```

Re-renders `{PHASE}.md` from `{phase}.json` (Zod validate + Handlebars). Omit phase to use current phase. **dev** has no json view.

Use after editing json artifacts; does not advance workflow or run quality gates.

## Agent 协议（必须遵守）

1. **优先改 json**，再 `render` — do not hand-edit md structure.
2. 用户只说 **`/taiyi:*` 斜杠**；你代跑 `scripts/taiyi-forge.sh`，禁止让用户手打 shell。
3. `render` 失败时读 Zod 错误，补全 json 后重试；勿跳过校验手改 md 过关。
