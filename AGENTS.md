# TaiyiForge (oh-my-taiyiforge)

开源 AI 研发工作流：**OpenCode** 插件 + **Claude / Codex / Cursor** 共用 `taiyi-*` Skill 与 `.taiyi/changes/<slug>/` 工件契约。

## 从这里读

| 目的 | 文档 |
|------|------|
| **5 分钟跑通** | [`docs/QUICKSTART.md`](docs/QUICKSTART.md) |
| **斜杠命令真源** | [`docs/taiyi/canonical-commands.md`](docs/taiyi/canonical-commands.md)（**v30 顶栏 · 21 条**）· [`docs/taiyi/commands.yaml`](docs/taiyi/commands.yaml) |
| **控制面 / Agent 纪律** | [`docs/taiyi/control-plane.md`](docs/taiyi/control-plane.md) |
| **工件目录** | [`docs/taiyi/artifact-layout.md`](docs/taiyi/artifact-layout.md) · [`docs/taiyi/artifact-contract.md`](docs/taiyi/artifact-contract.md)（json + hbs + md） |
| **九阶段流程** | [`docs/taiyi/nine-phase-flow.md`](docs/taiyi/nine-phase-flow.md) |
| **架构** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| **Skill 融合原则** | [`docs/taiyi/skill-fusion-principles.md`](docs/taiyi/skill-fusion-principles.md) |
| **贡献** | [`CONTRIBUTING.md`](CONTRIBUTING.md) |

## 硬约定（摘要）

1. 每个变更一个 slug：`.taiyi/changes/<slug>/`
2. 九阶段顺序见 `docs/taiyi/phases.yaml` — **上一阶段未完成不得进入下一阶段**
3. 过关须 **change / design / review 人工审批**（`continue --approver`）+ **质量门禁五维**（`docs/taiyi/quality-gate.yaml`）
4. **dev 阶段 TDD**：先失败测试，再最小实现
5. **Token 纪律**：清 slug → archive → `token compress` → E2E/全量测试走 CI 后台（对话只写 TEST.md 摘要）
6. **上下文加载**：进入阶段时优先读 `PHASE-CONTEXT.md`（引擎自动生成，~500 tokens），**不要**逐份读上游 md；语义真源在 `{phase}.json`

## Agent 读状态（默认）

```bash
scripts/taiyi-forge.sh status [slug] --json --compact
```

解析 **`engineTruth`**，勿全量读工件进聊天。人类用户要可读摘要时用无前缀 `status` 或 `--compact`（无 `--json`）。

排查：`doctor --json --compact` · `audit --json --compact`（仅失败项 / high findings）。Cursor 可用 MCP `taiyi_doctor` / `taiyi_audit`。

## 安装（一行）

```bash
npx taiyi-forge-install --all   # 23 个 taiyi-* Skill → 四端
```

细节见 **QUICKSTART**；引擎 shell：`scripts/taiyi-forge.sh` · [`docs/taiyi/control-plane.md`](docs/taiyi/control-plane.md)

## 许可

MIT — 见 [`LICENSE`](LICENSE)
