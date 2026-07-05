# src/templates/ PITFALLS

> Handlebars 模板 / 渲染专属。格式见 `.pitfalls/GLOBAL.md`。

### T-001 · [lib] Handlebars 的 `{{#each}}` 块内 `{{@key}}` 是字符串

- **首发**: full-flow-demo · 2026-06-22
- **适用栈**: Handlebars 4.x
- **状态**: active
- **关键词**: handlebars each @key string-index mermaid

**问题场景**
用 `{{@key}}` 作为 mermaid 节点 ID：
```handlebars
{{#each modules}}
  {{@key}}["{{name}}"]
{{/each}}
```

期望 `0["ModuleA"]`、`1["ModuleB"]`。但 mermaid 中纯数字节点 ID 在某些渲染器中有歧义。

**试过的方案**
直接用 `{{@key}}` 作为节点 ID。

**为什么不行**
mermaid.js 对纯数字 ID（如 `0`）的处理不一致：某些版本将其解析为字符串索引而非节点标签。

**正确做法**
- 节点 ID 加前缀：`m_{{@key}}`
- 连接箭头也加前缀：`m_0 --> m_1`
- 或用 `{{name}}` 作为 ID（需确保 name 无空格/特殊字符）

**何时重新评估**
升级 Handlebars / mermaid 到主版本后测试。

### T-002 · [arch] 模板中的 `{{else}}` 回退值不应从 fixture 拷贝

- **首发**: full-flow-demo · 2026-06-22
- **适用栈**: Handlebars 4.x
- **状态**: active
- **关键词**: template fallback placeholder duplication

**问题场景**
为每个模板字段写 `{{#if field}}{{field}}{{else}}_占位符_{{/if}}`，fixture 和模板回退值各自维护。

**试过的方案**
模板里 `{{else}}_待补充_{{/if}}`，fixture 里也写 `[待补充]`。

**为什么不行**
双份维护：改一处改完发现另一处还是旧值。E2E 生成内容出现 `_待补充_` vs `[待补充]` 不一致。

**正确做法**
- fixture JSON 是真源。模板回退值仅作视觉区分（如 `_N/A_` 斜体），不与 fixture 值重复
- E2E_ARTIFACTS fixture 必须填真实值（Zod schema 校验确保）
- 模板 `{{else}}` 仅用于非 E2E 场景的兜底

**何时重新评估**
引入模板→fixture 双向同步校验后。

### T-003 · [tool] 模板修改后必须跑 `npm test` 全量，不只跑 E2E

- **首发**: full-flow-demo · 2026-06-22
- **适用栈**: vitest
- **状态**: active
- **关键词**: template regression test e2e

**问题场景**
改 `.hbs` 文件后只跑 `tests/examples-full-flow-inplace.test.ts`。

**试过的方案**
`npx vitest run tests/examples-full-flow-inplace.test.ts`

**为什么不行**
其他 profile 的 CLI flow 测试（`tests/profile-cli-flow.test.ts`）也用相同的模板生成工件。只跑 inplace 测试会漏掉 profile=lite/api/spike/micro/nano 的回归。

**正确做法**
- 改 `.hbs` 文件 → `npm test`（全量 126 文件 / 780+ 用例）
- E2E fixture 变更 → 至少跑 `npm test`（全量）
- 只有纯 TypeScript 逻辑变更（不改模板）时才可单测

**何时重新评估**
CI 矩阵覆盖所有 profile 后。
