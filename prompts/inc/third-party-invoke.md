## 第三方 Skill / CLI（去重后）

**Superpowers** = 纪律 · **ECC** = 深度 · **CLI** = Playwright/OpenSpec/Changesets

详见 [library-selection.md](../../docs/taiyi/library-selection.md)

### 统一入口

| 意图 | 调用 |
|------|------|
| Superpowers | `/taiyi:skill sp <name>` · `/taiyi:skill tdd plan\|dev` |
| ECC | `/taiyi:skill ecc <name>` · `@ecc-<name>` |
| 引擎 E2E | `cap/e2e_test` → `npx playwright test` |
| 发版文档 | `taiyi-integration` + ECC `changelog-generator` |

### 打卡

```bash
scripts/taiyi-forge.sh harness-check <slug> ecc/architecture-audit
```

### 禁止

- 跳过 harness 双线硬约束直接 merge
- 依赖已退出的 GStack 主路径（除非在 providers.yaml 显式恢复）
