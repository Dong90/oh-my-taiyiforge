# 十轮 / 多角度探测 — 归类与处置（v0.22+）

供消费方探测脚本与 CI 矩阵对齐引擎真源，避免假红。更新日期：2026-06-09。

## 数量汇总

| 类别 | 数量 | 处置 |
|------|------|------|
| 已修复（核心） | 5 类 | archive 幂等、wrapper shim、list `--archived`、delivery gate、orphan runtime |
| 设计边界 / 非缺陷 | 见下表 #2–8 | 标 **BY DESIGN** |
| 仍开放 P1 | 4 | harness / DX 设计讨论 |
| 仍开放 P2 | 9 | 文档与体验，非阻塞发版 |
| 误报 / 探测脚本 | 5 | 更新断言 |
| 最新 deep/creative/alt | 0 | 主干健康 |

---

## 逐项对照（#1–9）

| # | 项 | 结论 | 探测期望 |
|---|-----|------|----------|
| 1 | help 未提 `list --archived` | **CLI**（`taiyi help` L134）与 **wrapper**（`taiyi-forge.sh` L92）已写；Skill 已补 | 断言 `taiyi help \| grep archived` 或读 Skill |
| 2 | `bug` 无 `--create` 不建 slug | **BY DESIGN** — 须显式 `--create`（同 `feature`） | 不期望隐式 init |
| 3 | null byte slug | **P2 已补** — `validateSlug` 拒绝 `\0` | exit 1 + 可读错误，非 spawn 层 |
| 4 | smoke-reset 仅 wrapper | **BY DESIGN** — CLI 无子命令 exit 2；wrapper exit 0 | cli=2 / wrapper=0 |
| 5 | ship/land/commit 仅斜杠 | **BY DESIGN** — exit 2 + 加载 gstack Skill | 不期望 shell 子命令 |
| 6 | daemon status 多变更需 slug | **BY DESIGN** — 多 active exit 1 | 提示指定 slug |
| 7 | cancel 后 aborted 占 list | **BY DESIGN** — `prune --aborted` 清理 | 非自动消失 |
| 8 | phase-guard 拦 IDE 改代码 | **BY DESIGN** — planning 阶段改 `scripts/`/`tests/` 被拒 | 门禁 intentional |
| 9 | 已完成变更 `step` exit 1 | **已修** — `action=done` + `ok=true` → exit 0 | 期望 exit 0 + 归档提示 |

---

## 仍开放 P1（非阻塞发版，需产品拍板）

1. **daemon dry-run 空转** — blocked 变更应在首轮 dry-run 早停（`stopReason=blocked`，非 `max-rounds`）；见 `runDaemonLoop` + `tests/daemon-runner.test.ts`（dry-run 用例期望 `轮次 1/N`）。
2. **`--auto init` 强依赖 intel-scan** — 无真实 `CONTEXT.md` 时 complete/ci verify 全 blocked；harness 契约 vs lite 降级。
3. **ralph 在 change 阶段 npm test 可过** — 易误导「可 continue」；人机门仍在；输出应强化 harness 文案。
4. **质量门极严** — 模板占位（`taiyi:seed-template`）无法 continue；门禁正确，DX 偏硬。

---

## 误报 / 探测脚本修正

| 项 | 原因 | 修正 |
|----|------|------|
| edge-probe token compress「崩溃」 | 实为 exit 1 友好拒绝 | 断言 exit 1 + 文案 |
| continue-probe 二次 archive 无 no-op | v0.22.0 已修 | 断言含「幂等 / 已归档」 |
| fullflow C1-init-fixed | probe-init-slug 已存在 | probe 加 `--force` 或换 slug |
| all-phases 4× verify/continue FAIL | 空模板被质量门拦 | 标 **expected blocked** |
| triple-channel wrapper diff | 修复前历史 | 现 0 diff |

---

## 已修复对照（供脚本 deprecate）

- token compress 归档 ENOENT → 已修
- 消费方 wrapper 全面落后 → shim + `sync-wrapper`
- integration `delivery.not-closed` → git commit 或 `TAIYI_DELIVERY_GATE=0`
- 孤儿 runtime / 多模式横幅 → prune + step 清理
- archive 二次无提示 → dated 目录名 + `formatArchivePlain` 幂等文案

---

## 探测脚本检查清单

```bash
# BY DESIGN — 不应 FAIL
taiyi smoke-reset                    # exit 2
scripts/taiyi-forge.sh smoke-reset   # exit 0

# 幂等 — 应 exit 0 + 文案
taiyi-forge archive <已完成-slug>    # 含「已归档」「幂等」

# 文档 — 应 PASS
taiyi help | grep -F '--archived'
head -100 scripts/taiyi-forge.sh | grep archived

# step 完成态
taiyi step <已完成-slug>             # exit 0

# daemon dry-run 早停
taiyi daemon run <blocked-slug> --dry-run --force --max-rounds 30
# stopReason 应为 blocked，roundCount << maxRounds
```

相关：`docs/taiyi/control-plane.md` · `skills/taiyi-forge/SKILL.md` · `docs/taiyi/canonical-commands.md`
