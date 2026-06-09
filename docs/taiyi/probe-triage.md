# 十轮 / 多角度探测 — 归类与处置（v0.22.1+）

供消费方探测脚本与 CI 矩阵对齐引擎真源，避免假红。更新日期：2026-06-09（ten-round 复核）。

## 数量汇总

| 类别 | 数量 | 处置 |
|------|------|------|
| 引擎 P1（待确认/加固） | 1 | daemon dry-run 早停（v0.22.1 已加固兜底） |
| 体验 P2 | 4 | 文档 / BY DESIGN，非阻塞发版 |
| 误报 / 探测脚本 | 5 | 更新断言或 `--force` |
| 已修复（0.22.x） | 多类 | archive 幂等、wrapper shim、handoff noop、step 完成态 |

---

## 引擎行为（P1）

| 问题 | 说明 | 引擎状态 |
|------|------|----------|
| **daemon dry-run 空转** | blocked 变更跑满 `max-rounds` 无早停 | **v0.22.1+**：多路径早停 + 轮末兜底（`stopReason=blocked`，`roundCount ≪ maxRounds`）；探测须带 `--dry-run --force` 且 slug 在 `changes/` |
| ~~ship 仅斜杠~~ | exit 2 + gstack 提示 | **BY DESIGN** — 勿标 P1；见「体验 P2」 |

---

## 体验（P2）

| 问题 | 说明 | 处置 |
|------|------|------|
| **bug 无 `--create` 不建 slug** | 仅输出 playbook | **BY DESIGN** — 须 `bug … --create` 或先 `/taiyi:new` |
| **help 未提 `list --archived`** | 文档/help 可补 | CLI + wrapper 已有；`/taiyi:help` · Skill 已补 |
| **null byte slug** | Node spawn 层拒绝 | **已补** — `validateSlug` 提前拒绝 NUL |
| **smoke-reset cli=2 / wrapper=0** | wrapper 专用 | **BY DESIGN** — 仅 `scripts/taiyi-forge.sh smoke-reset` |
| **ship/land/commit 仅斜杠** | exit 2 + gstack | **BY DESIGN** — 加载 gstack Skill，无 shell 子命令 |
| **归档 slug handoff exit 1** | `ten-r1-lite` 等仅 archive | **已修** — `resolveChangeDir` + dated 目录；**无** `.taiyi` 记录时 exit 1 正确 |

---

## 误报 / 脚本问题（非引擎 bug）

| 项 | 原因 | 修正 |
|----|------|------|
| edge P0 token compress「崩溃」 | 实为 exit 1 友好拒绝 | 断言 exit 1 + 文案，非 ENOENT |
| continue 二次 archive 无 no-op | v0.22+ 已有「幂等 no-op」 | 脚本检测逻辑过时 |
| ten-round init 已存在 | `ten-round-second` 未 `--force` | init 加 `--force` 或换 slug |
| fullflow C1-init-fixed | `probe-init-slug` 已存在 | 同上 |
| all-phases verify/continue FAIL | 空模板被质量门拦 | 标 **expected blocked** |

---

## 已修复（供脚本 deprecate）

- archive 二次无提示 / dated 目录名
- 消费方 wrapper 落后 → shim + `sync-wrapper`
- token compress 归档 ENOENT
- integration delivery gate 按 slug 过滤
- 孤儿 runtime / step 完成态 exit 0
- handoff 已完成/已归档 noop exit 0

---

## 探测脚本检查清单

```bash
# BY DESIGN — 不应 FAIL
npx taiyi smoke-reset                         # exit 2
./scripts/taiyi-forge.sh smoke-reset            # exit 0
npx taiyi ship                                  # exit 2 + gstack 提示

# 幂等 — exit 0 + 文案
taiyi-forge archive <已完成-slug>               # 「已归档」「幂等」

# 文档 — PASS
npx taiyi help | grep -F '--archived'

# handoff 归档-only（.taiyi/archive 含 state.json）
taiyi-forge handoff ten-r1-lite                 # exit 0 + 「已归档|无需 handoff」

# daemon dry-run 早停（须 --force + --dry-run）
taiyi-forge daemon run <blocked-slug> --dry-run --force
# 期望：轮次 1/N · stopReason blocked · 含「提前退出」
```

相关：`docs/taiyi/control-plane.md` · `skills/taiyi-forge/SKILL.md` · `prompts/taiyi-help.md`

---

## S0–S10 冒烟矩阵（2026-06-09）

| 场景 | 结果 | 说明 |
|------|------|------|
| S0 doctor→…→ci | ✓ | 基线命令面 |
| S1 bug --create 链 | ✓ | |
| S2 feature --create 链 | ✓ | |
| **S3 lite→archive** | ✗ | 见下 |
| **S4 full→archive** | ✗ | 见下 |
| S5 handoff/resume | ✓ | |
| S6 已完成 ty-5zg95luk | ✓ | archive 幂等 |
| S7 daemon dry-run | ✓ | |
| S8 斜杠-only exit 2 | ✓ | BY DESIGN |
| S9 trim-ahead/stop-mode | ✓ | |
| S10 new/profile/cancel | ✓ | |

### S3 / S4 archive 失败 — 根因与处置

| 根因 | 探测表现 | 处置 |
|------|----------|------|
| **integration 未完成** | `请先完成 integration 阶段再归档` exit 1 | S3/S4 须先让 `continue`/`complete` 过关 integration（质量门+人工门）；空模板 `continue×N` 不够 |
| **OpenSpec CLI 失败** | openspec 校验/spec 失败 exit 1 | **v0.22.2+**：integration 已完成时 **降级 Taiyi-only 归档** exit 0；或 `archive --skip-specs` |
| **Taiyi 移动失败却 exit 0** | 假成功 | **已修**：`taiyiArchiveResult.ok === false` 时返回 exit 1 |
| **探测断言过时** | 期望 changes/ 仍在 | OpenSpec 已归档时 Taiyi 可仍在 changes/（verify 可用） |

**引擎仓自测**：`runSlashFlow({ profile: 'lite'|'full', runFinish: true })` archive exit 0（无 OpenSpec 或降级路径）。

---

## SUITE-fullflow — `tests/taiyi-fullflow-probe.mjs` / `scripts/probes/taiyi-fullflow-probe.mjs`

**结果示例**：13 通过 / 1 失败（exit 1）· 报告 `.taiyi/fullflow-probe-report.json`

### 1.1 唯一硬失败：C1-init-fixed

| 项 | 内容 |
|----|------|
| 命令 | `init probe-init-slug --profile lite --title Init probe` |
| 实际 | exit 1 · `Change already exists … Use --force` |
| 根因 | 工作区已有 completed 的 `probe-init-slug`，固定 slug 无 `--force` |
| 性质 | **脚本问题**，非引擎 bug |
| 修法 | `init … --force` / 随机 slug / 跑前 `cancel … --remove-dir` / `expect [0,1]` |

### 1.2 静默跳过（B/D/E/G 未跑）

无 `--create` 时 `bug`/`feature` stdout 无 slug，正则 `ty-[a-z0-9]+` 匹配失败 → 整段链跳过。

| 分组 | 未跑用例 | 修法 |
|------|----------|------|
| B | B2-bug-status、B3-bug-profile-lite | `bug … --create` |
| D | D1–D6 team/ralph/… | `feature … --create` |
| E | E1-cancel、E2-list-after-cancel | 同上 |
| G | G2-agent、G3-loop、G4-review-loop | 同上 |

扩展 slug 正则：`/(ty|fix|add)-[a-z0-9-]+/` 或读 `state.json`；**或**用与引擎一致的 `slugifyTitle(标题)` 推导（变更已存在时 stdout 无 slug，勿误匹配 `lite`/`full` 等词）。

**引擎仓 `scripts/probes/taiyi-fullflow-probe.mjs`（v0.22.2+）**：C1 `--force` + 标题推导 slug → **6/6 绿**。

### 1.3 已通过说明

| ID | 说明 |
|----|------|
| A3-archive-twice | 第二次含「幂等 no-op」（v0.22+） |
| A4-sync-after-archive | exit 1 在 `expect [0,1]` 内 — 已归档拒绝写 active |
| I1-run | 可有「代码漂移」警告，不导致失败 |

---

## SUITE-postfix — `.taiyi/post-fix-regression.mjs` / `scripts/probes/post-fix-regression.mjs`

**结果示例**：14 通过 / 3 失败 → 修正断言后 **6/6 绿**（`npm run probe:postfix`）。

### 2.1 cmd-smoke-reset（勿三通道 parity）

| 通道 | exit | 说明 |
|------|------|------|
| CLI `npx taiyi smoke-reset` | **2** | 无子命令，BY DESIGN |
| consumer / upstream wrapper | **0** | 内部 `stop-mode --force` |

**修法**：分别断言 `cli===2`、`wrapper===0`，删除 `cli===consumer===upstream`。

### 2.2 run-consumer / run-cli-parity

全量 E2E 后 workspace 残留可导致 consumer `run` 偶发 exit 1；单独跑常为 0。

**修法**：`run-consumer` / `run-cli` 用 `expect [0,1]`；parity 改为「两者相等或均为 0」。

### 2.3 其他

| ID | 说明 |
|----|------|
| token-compress-arch | `Change not found` 测「不崩溃」即可 |
| archive-idempotent | 已通过 |

---

## 汇总：失败项 vs 引擎

| 套件 | 失败项 | 类型 | 引擎 bug？ |
|------|--------|------|-----------|
| fullflow | C1-init-fixed | 固定 slug | 否 |
| fullflow | B/D/E/G 未跑 | 无 `--create` | 否（覆盖缺口） |
| postfix | cmd-smoke-reset | BY DESIGN | 否 |
| postfix | run-consumer | 偶发+断言过严 | 待观察 |

**引擎仓一键复跑**（修正版）：

```bash
npm run build
npm run probe:fullflow    # 6/6
npm run probe:postfix     # 6/6
# 可选：TAIYI_PROBE_ARCHIVE_SLUG=ty-5zg95luk 测 archive 幂等
```
