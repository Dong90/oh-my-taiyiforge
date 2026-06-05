# TaiyiForge (oh-my-taiyiforge)

开源 AI 研发工作流：**OpenCode**（npm 插件）与 **Claude Code / Codex / Cursor**（`taiyi-*` Skills）共用同一套工件契约。

## 快速约定

1. 每个变更一个 slug：`.taiyi/changes/<slug>/`
2. 九阶段顺序见 `docs/taiyi/phases.yaml`，**上一阶段工件未完成不得进入下一阶段**
3. 完成阶段前须满足：**人工审批** + **质量门禁五维**（见 `docs/taiyi/quality-gate.yaml`）
4. 开发阶段（`taiyi-dev`）强制 **TDD**：先失败测试，再最小实现

## OpenCode

```bash
npm install oh-my-taiyiforge
```

在 `opencode.json` 中：

```json
{ "plugin": ["oh-my-taiyiforge"] }
```

使用工具 `taiyi_init` / `taiyi_complete` 等管理 `.taiyi/changes/<slug>/`。详见 `docs/opencode-setup.md`。

## Claude Code

```bash
./scripts/install-skills.sh claude
# 或在项目内：
./scripts/install-skills.sh project-claude
```

在对话中按阶段加载 Skill，例如读取 `skills/taiyi-design/SKILL.md` 或使用已安装的 `/taiyi-design`（若 CLI 支持）。

## OpenAI Codex

```bash
./scripts/install-skills.sh codex
```

将本文件链入项目 `AGENTS.md` 或 `~/.codex/AGENTS.md`。阶段执行时加载对应 `skills/taiyi-<phase>/SKILL.md`。  
可与 **oh-my-codex (OMX)** 并存：OMX 编排多 Agent，TaiyiForge 管阶段工件与门禁。

## 引擎 CLI（与 Agent 无关）

```bash
npm install
npm run taiyi -- init <slug>
npm run taiyi -- phases
npm run taiyi -- complete <slug> <phase>
```

## 文档

- 架构：`docs/ARCHITECTURE.md`
- 双端配置：`docs/taiyi/agents.yaml`
- 贡献：`CONTRIBUTING.md`

## 许可

MIT — 见 `LICENSE`。
