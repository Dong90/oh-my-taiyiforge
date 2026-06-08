# Git / PR / 部署斜杠（gstack 直连）

TaiyiForge **九阶段**管工件与门禁；**git · PR · 部署**通过下列斜杠加载 **gstack Skill**（须 `taiyi-forge-install --all` 安装 gstack）。

## 推荐交付链

```text
dev/test 完成
  → /taiyi:commit          # Taiyi trailer + git commit
  → /taiyi:verify          # 工件门禁
  → /taiyi:gstack review   # gstack 审 diff（可选，review 阶段）
  → /taiyi:ship            # gstack：测试 · push · 开 PR
  → /taiyi:land            # gstack：merge · CI · deploy · canary
  → /taiyi:release         # gstack document-release（可选）
  → /taiyi:continue integration
  → /taiyi:archive
```

## 斜杠一览

| 斜杠 | gstack Skill | 作用 |
|------|--------------|------|
| `/taiyi:commit` | （Taiyi `commit-trailers` + git） | 带 `Taiyi-Change` 的 commit |
| `/taiyi:ship` | `ship` | 推分支、开 PR |
| `/taiyi:land` | `land-and-deploy` | 合并、部署、canary |
| `/taiyi:gstack review` | `review` | PR/diff 结构审查（≠ `/taiyi:review-loop`） |
| `/taiyi:gstack qa` | `qa` | 站点 QA（test 阶段 optional） |
| `/taiyi:release` | `document-release` | 文档/CHANGELOG 发布同步 |
| `/taiyi:gstack <skill>` | 任意 gstack | design-shotgun · autoplan · canary · gstack-upgrade 等 |
| `/taiyi:sp <skill>` | Superpowers | writing-skills 等 |
| `/taiyi:security` | semgrep + trivy | SAST/漏洞（review） |
| `/taiyi:e2e` | Playwright | E2E（test） |
| `/taiyi:resume` | HANDOFF + status | 恢复会话 |
| `/taiyi:help` | — | 斜杠总览 |

Codex：`$taiyi-ship`、`$taiyi-land`、`$taiyi-commit` 等（`prompts/taiyi-*.md`）。

## 与 TaiyiForge 门禁的关系

- **`/taiyi:ship` / `/taiyi:land` 不替代** `/taiyi:continue` integration 的交付门（须 commit、干净工作区、trailer）。
- gstack 管 **GitHub/部署**；TaiyiForge 管 **`.taiyi/changes/` 阶段真源**。

详见 [integrations.md](./integrations.md) · [delivery-gate.md](./delivery-gate.md)。
