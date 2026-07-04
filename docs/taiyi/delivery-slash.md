# 交付链斜杠命令

> TaiyiForge 管 `.taiyi/changes/<slug>/` 九阶段；**git · PR · 部署**由 native **git + gh** + **`delivery.yaml`** 驱动。

## 链顺序

```
/taiyi:commit → verify → /taiyi:ship → /taiyi:land → /taiyi:continue → /taiyi:archive
```

预览引擎命令（Agent 代跑）：

```bash
taiyi delivery-plan [slug]          # 人类可读
taiyi delivery-plan [slug] --json   # 机读 steps
```

## 斜杠 ↔ CLI

| 斜杠 | 引擎 CLI | 说明 |
|------|----------|------|
| `/taiyi:commit [slug] [subject]` | `commit-trailers` + git | 读 `delivery.yaml` 模板 |
| `/taiyi:verify` | `verify` | 工件门禁 |
| `/taiyi:ship` | `delivery-plan` → push + `gh pr create` | 见 `prompts/taiyi-ship.md` |
| `/taiyi:land` | `delivery-plan` → merge + deploy | 见 `prompts/taiyi-land.md` |
| `/taiyi:continue` | `continue` | integration 交付门 |
| `/taiyi:archive` | `archive` | 归档 |

## 配置

| 文件 | 内容 |
|------|------|
| `docs/taiyi/delivery.yaml` | 包默认 |
| `.taiyi/delivery.yaml` | 项目覆盖（init-wizard 会 seed 注释骨架） |
| `.taiyi/config.json` | `deliveryGate` 等开关 |

详见 [configuration.md](./configuration.md) · [delivery-gate.md](./delivery-gate.md)

## 与九阶段边界

- **TaiyiForge**：工件、质量门禁、交付门（commit / trailer / 干净工作区）
- **ship/land**：不替代 `/taiyi:continue`；PR 前后仍须 `engineTruth` 过关
