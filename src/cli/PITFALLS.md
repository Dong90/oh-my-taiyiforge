# src/cli/ PITFALLS

> CLI 参数 / 命令注册专属。格式见 `.pitfalls/GLOBAL.md`。

### CLI-001 · [tool] `commander` 的 `.action()` 不支持 async 返回值错误处理

- **首发**: N/A · 2026-06-22
- **适用栈**: commander 12.x / Node 20+
- **状态**: active
- **关键词**: commander async error-handling exit-code

**问题场景**
```typescript
program.command("status")
  .action(async (slug) => {
    await doStatus(slug);  // throws → unhandled rejection
  });
```

**试过的方案**
依赖 commander 自动捕获 async action 的 rejected promise。

**为什么不行**
commander 的 `.action()` 默认不处理 async 函数的异常。rejected promise 会变成 unhandled rejection，进程可能不退出或 exit code 不对。

**正确做法**
```typescript
.action(async (slug) => {
  try {
    await doStatus(slug);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
});
```
或用 `.action(() => doStatus(slug).catch(e => { ... process.exit(1) }))`

**何时重新评估**
commander 官方支持 async error boundary 后。

### CLI-002 · [tool] `spawnSync` 的超时单位是毫秒不是秒

- **首发**: full-flow-demo · 2026-06-22
- **适用栈**: Node 20+
- **状态**: active
- **关键词**: spawnSync timeout ms seconds unit

**问题场景**
```typescript
spawnSync("some-long-command", [], { timeout: 60 });
```
期望 60 秒超时。

**试过的方案**
传数字 60。

**为什么不行**
Node.js `spawnSync` 的 timeout 单位是毫秒。传 60 意味着 60ms 超时，长期运行的命令立即被杀。

**正确做法**
- `timeout: 60_000`（60 秒）或用命名常量 `const ONE_MIN = 60_000`
- 文档注释写清楚：`/** timeout in ms */`

**何时重新评估**
Node.js 引入 `timeoutSeconds` 选项后。
