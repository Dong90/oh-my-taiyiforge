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
- **状态**: resolved (2026-07-05)
- **关键词**: template fallback placeholder duplication
- **关闭方式**: 8 个 `.hbs` 模板全部移除 `{{else}}` 占位符文本。`buildSeedJson` 
  统一生成空值 seed，`autoFillJson` 用 `deepMerge` 填充缺失字段。模板不再有
  双份维护问题——fixture JSON 是唯一真源，模板无条件渲染数据，数据空则段空或消失。
- **正确做法（新）**: 
  - `{{#if data}}` 控制段显隐，不再用 `{{else}}` 放占位符
  - `[MEDIUM+]` 段数据缺失 → 整段不渲染，不由模板提供降级内容
  - 低复杂度变更通过 seed 生成控制不产 `[MEDIUM+]` 字段

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
