# 交付门与部署（Delivery Gate + 交付链 Slash）

## 引擎交付门

`complete <slug> integration` 时，若工作区为 **git 仓库**（默认启用）：

1. 相对 `origin/develop`（或 `origin/main`）须有 **已 commit 的新增 diff**
2. 工作区须 **干净**（无 unstaged / staged / untracked）
3. 可选验证命令（优先级：`TAIYI_DELIVERY_VERIFY_CMD` > `package.json` 的 `taiyi.deliveryVerifyCmd`）
4. **Commit trailers**（默认启用）：commit 中至少一条须含 `Taiyi-Change: <slug>`

非 git 目录自动跳过。关闭：`TAIYI_DELIVERY_GATE=0`

## 交付链 Slash（gstack 直连）

TaiyiForge **九阶段**管工件与门禁；**git · PR · 部署**通过下列斜杠加载 **gstack Skill**。

```text
dev/test 完成
  → /taiyi:commit          # Taiyi trailer + git commit
  → /taiyi:verify          # 工件门禁
  → /taiyi:gstack review   # gstack 审 diff（可选）
  → /taiyi:ship            # gstack：测试 · push · 开 PR
  → /taiyi:land            # gstack：merge · CI · deploy · canary
  → /taiyi:release         # gstack document-release（可选）
  → /taiyi:continue integration
  → /taiyi:archive
```

| 斜杠 | gstack Skill | 作用 |
|------|--------------|------|
| `/taiyi:commit` | Taiyi `commit-trailers` + git | 带 trailer 的 commit |
| `/taiyi:ship` | `ship` | 推分支、开 PR |
| `/taiyi:land` | `land-and-deploy` | 合并、部署、canary |
| `/taiyi:gstack review` | `review` | PR/diff 结构审查 |
| `/taiyi:gstack qa` | `qa` | 站点 QA |
| `/taiyi:release` | `document-release` | 文档/CHANGELOG 同步 |
| `/taiyi:gstack <skill>` | 任意 gstack | design-shotgun · autoplan · canary 等 |

gstack 管 **GitHub/部署**；TaiyiForge 管 **`.taiyi/changes/` 阶段真源**。

## Commit trailers

```text
feat: export path fix

Taiyi-Change: my-slug
Taiyi-Phase: dev
```

关闭：`TAIYI_COMMIT_TRAILERS=0`

## 关闭交付门

```bash
TAIYI_DELIVERY_GATE=0 npx taiyi complete <slug> integration --approver "你"
```
