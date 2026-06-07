# Superpowers 主轴流程示例

用 **Superpowers 全技能** + TaiyiForge 九阶段跑通一个变更。

## 1. 总览

```text
/taiyi:flow
```

或读 [`docs/taiyi/superpowers-flow.md`](../../docs/taiyi/superpowers-flow.md)。

## 2. 新建变更

```text
/taiyi:new 示例功能
/taiyi:status
```

## 3. 按阶段

| 阶段 | Superpowers | 斜杠 |
|------|-------------|------|
| change | brainstorming | `/taiyi:explore` |
| task | writing-plans + test-driven-development | `/taiyi:tdd plan` |
| dev | test-driven-development | `/taiyi:tdd dev` · `/taiyi:apply` |
| test | verification-before-completion | `/taiyi:apply` |
| review | requesting-code-review | `/taiyi:review-loop` |
| integration | finishing-a-development-branch | `/taiyi:audit` · `/taiyi:archive` |

写工件：`taiyi-change` … `taiyi-integration`（聊天加载 Skill）。

## 4. 可选外挂（不阻塞过关）

- **gstack**：`plan-eng-review` · `qa` · `review` · `document-release`
- **OpenSpec**：`openspec change show` · `taiyi archive`
- **web-quality-skills**：`accessibility`
- **Playwright** · **Semgrep** · **Trivy** · **Changesets**（CLI，按项目安装）

真源：[`docs/taiyi/workflow-manifest.yaml`](../../docs/taiyi/workflow-manifest.yaml)
