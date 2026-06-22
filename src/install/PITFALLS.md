# src/install/ PITFALLS

> Skill 同步 / 安装专属。格式见 `.pitfalls/GLOBAL.md`。

### I-001 · [tool] 同步 Skill 到多端时不要假设所有端都已安装

- **首发**: N/A · 2026-06-22
- **适用栈**: Node 20+ / macOS / Linux
- **状态**: active
- **关键词**: install sync multi-platform missing cli

**问题场景**
```typescript
// 假设 codex / cursor / claude 都已安装
await syncSkills("opencode");  // ✅
await syncSkills("claude");    // ❌ claude not installed
```

**试过的方案**
同步所有四端，遇到缺失就报错退出。

**为什么不行**
用户可能只装了 2/4 端（如只有 OpenCode + Claude，没有 Codex + Cursor）。报错退出会让已同步的端也没法用。

**正确做法**
- `taiyi-forge.sh install --all` 模式：缺失的端输出 warning 而非 error，继续同步其他端
- 在 `syncSkills()` 中用 try/catch + warn log，不抛异常
- doctor 命令汇总所有端的安装状态供用户排查

**何时重新评估**
引入自动安装缺失端的能力后。

### I-002 · [ops] Skill 文件路径中的 `~` 需要手动展开

- **首发**: N/A · 2026-06-22
- **适用栈**: Node 20+
- **状态**: active
- **关键词**: tilde expansion home-dir path resolve

**问题场景**
```typescript
const skillDir = "~/.claude/skills/";
fs.writeFileSync(path.join(skillDir, "my-skill.md"), content);
```

**试过的方案**
直接用 `~` 作为路径前缀。

**为什么不行**
Node.js 的 `fs` 和 `path` 模块不认识 `~`（仅 shell 会展开）。`~/.claude/` 会被当成当前目录下的字面量子目录。

**正确做法**
- 用 `os.homedir()` 获取 home 目录：`path.join(os.homedir(), ".claude/skills/")`
- 或用 `process.env.HOME`（Unix/macOS）/ `process.env.USERPROFILE`（Windows）
- 优先用 `os.homedir()`（跨平台最可靠）

**何时重新评估**
Node.js 原生支持 tilde 路径解析后。
