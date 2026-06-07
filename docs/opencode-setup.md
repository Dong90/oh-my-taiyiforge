# OpenCode 安装（与 Superpowers / oh-my-openagent 相同方式）

## 1. 安装（与 Superpowers / oh-my-openagent 相同）

```bash
npm install oh-my-taiyiforge
```

**postinstall 自动完成：**

1. 将 `taiyi-*` skills 同步到 `~/.config/opencode/skills/`
2. 同步到 `~/.claude/skills/`、`~/.codex/skills/`、`~/.cursor/skills/`（四端同源）
3. 在 `~/.codex/AGENTS.md` 插入 TaiyiForge 指引段落（若不存在则创建）
4. 向 **`~/.config/opencode/opencode.json`** 的 `plugin` 数组追加 `"oh-my-taiyiforge"`（若尚未存在）

本地开发包：

```bash
npx taiyi-forge-install --all
# 会在 ~/.config/opencode 执行 npm install <本仓库路径> 并注册 plugin
```

跳过自动改配置：`TAIYI_FORGE_SKIP_OPENCODE_CONFIG=1 npm install oh-my-taiyiforge`

## 2. 确认 plugin 条目

`opencode.json` 中应包含（可与其它插件并列）：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "oh-my-openagent",
    "oh-my-taiyiforge"
  ]
}
```

## 3. 重启 OpenCode

加载后可用工具：

| 工具 | 作用 |
|------|------|
| `taiyi_init` | 创建 `.taiyi/changes/<slug>/`（固定 slug，CI/脚本用） |
| `taiyi_new` | **日常推荐** — 从标题自动 slug（对齐 `/taiyi:new`） |
| `taiyi_guide` | 当前阶段该做什么（Skill、工件、质量预检） |
| `taiyi_status` | 查看阶段状态（含 guide） |
| `taiyi_phases` | 列出九阶段与 `taiyi-*` skill |
| `taiyi_complete` | 完成当前阶段（门禁 + 工件） |
| `taiyi_handoff` | 写 `HANDOFF.md` 供跨会话恢复（对齐 `/taiyi:handoff`） |
| `taiyi_cancel` | 取消活跃变更，保留目录（对齐 `/taiyi:cancel`） |
| `taiyi_commit_trailers` | 生成含 `Taiyi-Change` / `Taiyi-Phase` 的 commit message 建议 |
| `taiyi_assess` | 复杂度评估与辅助 skill 建议 |
| `taiyi_archive` | 九阶段完成后执行 `openspec archive <slug>`（若项目已初始化 OpenSpec） |

## 4. 一键安装（四端）

在仓库根目录：

```bash
git clone <repo> oh-my-taiyiforge
cd oh-my-taiyiforge
npm install
./scripts/install.sh --all
```

按需组合：

```bash
npx taiyi-forge-install --cursor
npx taiyi-forge-install --claude --cursor
TAIYI_FORGE_INSTALL=opencode,cursor npm install
```

## 5. 与 Claude / Codex / Cursor 对齐

| 端 | 配置 |
|----|------|
| OpenCode | `"plugin": ["oh-my-taiyiforge"]` + 上表工具 |
| Claude | `~/.claude/skills/taiyi-*` |
| Codex | `~/.codex/skills/taiyi-*` + `AGENTS.md` |
| Cursor | `~/.cursor/skills/taiyi-*` |

Skill 正文均在包内 `skills/taiyi-*/SKILL.md`，**四端同源**。Cursor 无 plugin 工具，用 Skill + `npx taiyi` CLI。
