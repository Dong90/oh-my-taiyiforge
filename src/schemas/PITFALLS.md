# src/schemas/ PITFALLS

> Zod schema 校验专属。格式见 `.pitfalls/GLOBAL.md`。

### S-001 · [arch] Zod schema 修改后必须同步更新 E2E fixture

- **首发**: full-flow-demo · 2026-06-22
- **适用栈**: zod 3.x
- **状态**: active
- **关键词**: zod schema e2e fixture drift validation

**问题场景**
在 `src/schemas/change.ts` 给 `ChangeSchema` 加了必填字段，但没更新 `E2E_JSON_ARTIFACTS.change`。

**试过的方案**
先改 schema，跑 E2E 时发现报错再补 fixture。

**为什么不行**
E2E 测试在 schema 校验时抛 ZodError，但错误信息只告诉哪个字段缺失，不告诉预期格式。AI 补 fixture 可能填错类型。

**正确做法**
- 改 schema → 立即跑 `npm test`，按 ZodError 逐条补 fixture
- 或在 `E2E_JSON_ARTIFACTS` 上直接加 `satisfies` 类型标注：
  ```typescript
  const data: z.infer<typeof ChangeSchema> = { ... };
  ```
- CI 中 `npm test` 会在 schema 变更时立即发现 fixture 漂移

**何时重新评估**
引入 fixture auto-generation from schema 后。

### S-002 · [lib] Zod `.optional()` vs `.nullable()` 语义区别

- **首发**: N/A · 2026-06-22
- **适用栈**: zod 3.x
- **状态**: active
- **关键词**: zod optional nullable undefined null

**问题场景**
```typescript
const schema = z.object({
  field: z.string().optional()  // 期待可以传 null
});
schema.parse({ field: null });  // ❌ ZodError: Expected string, received null
```

**试过的方案**
用 `.optional()` 同时接受 `undefined` 和 `null`。

**为什么不行**
- `.optional()` = 字段可以不存在，存在时必须是 `string`（不接受 `null`）
- `.nullable()` = 字段必须存在，值可以是 `string | null`（不接受 `undefined`）
- `.nullish()` = 字段可以不存在，值可以是 `string | null | undefined`

**正确做法**
- 用 `.optional()`：字段可缺省但若存在则类型必须正确
- 用 `.nullable()`：字段可显式标记为无值（如 DB 中 NULL）
- 用 `.nullish()`：JSON API 中字段可缺或为 null
- 不要混用 `.optional().nullable()` 除非有明确语义

**何时重新评估**
Zod 4.x 统一 null/undefined 处理后。
