# 交付门与部署（Delivery Gate + 交付链 Slash）

## 引擎交付门

`continue <slug> integration`（或 `/taiyi:continue`）时，若工作区为 **git 仓库**（默认启用）：

1. 相对 `delivery.yaml` 配置的 base 分支须有 **已 commit 的新增 diff**
2. 工作区须 **干净**（无 unstaged / staged / untracked；slug 范围见 `delivery-gate` 实现）
3. 可选验证命令（优先级：`TAIYI_DELIVERY_VERIFY_CMD` > `config.json` > `delivery.yaml` > `package.json`）
4. **Commit trailers**（默认启用）：至少一条 commit 须含配置的 slug trailer（默认 `Taiyi-Change: <slug>`）

非 git 目录自动跳过。关闭：`TAIYI_DELIVERY_GATE=0` 或 `config.json` → `"deliveryGate": false`

## 交付链 Slash（git + gh · delivery.yaml）

TaiyiForge **九阶段**管工件与门禁；**git · PR · 部署**由 **`taiyi delivery-plan`** + **gh** 代跑（见 [delivery-slash.md](./delivery-slash.md)）。

```text
dev/test 完成
  → /taiyi:commit          # commit-trailers + git commit
  → /taiyi:verify          # 工件门禁
  → /taiyi:ship            # delivery-plan → push · gh pr create
  → /taiyi:land            # delivery-plan → merge · deploy · health
  → /taiyi:continue integration
  → /taiyi:archive
```

| 斜杠 | 驱动 | 作用 |
|------|------|------|
| `/taiyi:commit` | `commit-trailers` + git | 按 `delivery.yaml` 模板提交 |
| `/taiyi:ship` | `delivery-plan` | 推分支、开 PR |
| `/taiyi:land` | `delivery-plan` | 合并、部署、健康检查 |

配置真源：[configuration.md](./configuration.md)

## Commit trailers

默认格式（可在 `.taiyi/delivery.yaml` 定制）：

```text
feat: export path fix

Taiyi-Change: my-slug
Taiyi-Phase: dev
```

关闭：`TAIYI_COMMIT_TRAILERS=0`

## 关闭交付门

```bash
TAIYI_DELIVERY_GATE=0 scripts/taiyi-forge.sh continue <slug> integration
```
