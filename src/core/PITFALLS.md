# src/core/ PITFALLS

> 工作流引擎 / 状态机 / 阶段逻辑专属。格式见 `.pitfalls/GLOBAL.md`。

### C-001 · [arch] completePhase 前必须确认 state.json 已刷新

- **首发**: full-flow-demo · 2026-06-22
- **适用栈**: Node 20+ / TypeScript
- **状态**: active
- **关键词**: state sync completePhase race-condition

**问题场景**
连续调用 `completePhase()` 时不等待 state.json 写入完成，导致下一阶段读到旧状态。

**试过的方案**
```typescript
// 同步 fs.writeFileSync + 立即读
fs.writeFileSync(path, JSON.stringify(state));
completePhase(nextPhase);
```

**为什么不行**
`completePhase` 内部异步操作可能在 write 完成前就读取 state，尤其在 CI 环境中 I/O 延迟高。

**正确做法**
- `WorkflowEngine.completePhase()` 内部使用 `writeFileSync` + 读时校验 `mtime`
- 批量阶段跑 E2E 时：每个 `completePhase` 后加 `fs.statSync` 确认 mtime 更新
- 见 `src/core/state-manager.ts` 的 `writeAndVerify()` 模式

**何时重新评估**
引入事件驱动 state 更新后。

### C-002 · [arch] PhaseContext 的 appendPhaseToContext 不要并发调用

- **首发**: full-flow-demo · 2026-06-22
- **适用栈**: Node 20+
- **状态**: active
- **关键词**: phase-context append concurrent file-corruption

**问题场景**
并行完成多个阶段时同时调用 `appendPhaseToContext`，文件内容交错或丢失。

**试过的方案**
每个阶段独立写 `PHASE-CONTEXT-{phase}.md`，最后合并。

**为什么不行**
合并逻辑复杂（插入位置计算、footer 替换），且合并时可能已有新阶段完成。

**正确做法**
- `appendPhaseToContext` 内部使用临时文件 + 原子 rename
- 引擎层确保同一 change 的阶段串行完成（`WorkflowEngine` 已做）
- 不要在外部（如 E2E test）并发调 `completePhase`

**何时重新评估**
改用 SQLite 作为状态存储后。

### C-003 · [lib] Handlebars `{{#if}}` 对空数组和空字符串的判断

- **首发**: full-flow-demo · 2026-06-22
- **适用栈**: Handlebars 4.x
- **状态**: active
- **关键词**: handlebars if falsy empty-array template

**问题场景**
`.hbs` 中用 `{{#if modules}}` 判断是否有模块数据。`modules` 是空数组 `[]` 时。

**试过的方案**
依赖 `{{#if modules}}` 的 falsy 行为跳过渲染。

**为什么不行**
Handlebars 的 `{{#if}}` 对空数组 `[]` 返回 `true`（与 JavaScript 的 `if ([])` 行为一致——空数组是 truthy）。

**正确做法**
- 使用 `{{#if modules.length}}` 判断非空
- 或 `{{#each modules}}{{#if @first}}...{{/if}}{{/each}}` 通过迭代副作用判断
- 模板引擎 `render()` 方法中预检查数组长度，设置辅助变量 `_hasModules`

**何时重新评估**
升级到 Handlebars 5.x（若有 breaking change）。

### C-004 · [perf] `glob` 遍历所有 .hbs 文件应在模板引擎初始化时缓存

- **首发**: N/A · 2026-06-22
- **适用栈**: Node 20+
- **状态**: active
- **关键词**: glob cache template performance init

**问题场景**
每次渲染模板时都 `fs.readdirSync` + `glob` 遍历所有 `.hbs` 文件。

**试过的方案**
```typescript
function getTemplate(name: string): string {
  const files = glob.sync("src/templates/*.hbs");
  // find matching file...
}
```

**为什么不行**
每次 CLI 命令调用（status / continue / write）都触发 glob，N 个命令 = N 次 I/O。在 CI 中可能累积几百 ms。

**正确做法**
- `getTemplateEngine()` 初始化时做一次 glob，结果缓存到 `Map<string, string>`
- 设置 `TAIYI_TEMPLATE_RELOAD=1` 环境变量强制刷新（仅 dev 用）

**何时重新评估**
改用 import 静态导入所有模板后。
