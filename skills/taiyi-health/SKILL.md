---
name: taiyi-health
description: TaiyiForge 辅助 — 代码健康检查报告（review 前可选）。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-health

## 目的

在 `taiyi-review` 之前建立**可复现的质量基线**：类型、lint、测试、构建——用命令输出说话，避免 review 争论「能不能跑」。

## 何时使用

| 时机 | 说明 |
|------|------|
| `taiyi-review` 之前 | harness 默认推荐 |
| dev 多 slice 合并后 | 抓回归 |
| `taiyi_assess` = high | 与 `taiyi-evolve` 搭配 |
| CI 红灯本地复现 | 先 health 再修 |

可跳过：仅改 Markdown 工件、且 review 不涉及代码路径。

## 输入

- 项目根目录
- `package.json` / `Makefile` / `pyproject.toml` 等（探测脚本）
- （可选）`TEST.md` 中声明的命令

## 输出

- `.taiyi/changes/<slug>/health-report.md`
- 附：**原始命令 + 退出码**（摘要写入报告，长日志可指 `附：终端截图或 CI 链接`）

## 探测顺序（自适应）

1. 读项目根 **官方入口**：`package.json scripts`、`CONTRIBUTING.md`、`.github/workflows`
2. 若存在 `npm run health` / `make check` / `just verify` → **优先用项目自有聚合命令**
3. 否则按下表逐项探测（存在才跑，不存在标 `N/A`）

| 维度 | 探测命令（示例） | 阻塞规则 |
|------|------------------|----------|
| 安装/构建 | `npm run build` / `cargo build` | 失败 → **BLOCK** |
| 类型检查 | `tsc --noEmit` / `pyright` / `mypy` | 失败 → **BLOCK** |
| Lint | `eslint .` / `ruff check` / `clippy` | 项目若 CI 强制 → **BLOCK**，否则 **WARN** |
| 单元测试 | `npm test` / `pytest` | 失败 → **BLOCK** |
| 死代码/重复 | 项目既有工具 | 默认 **WARN** |
| 安全扫描 | `npm audit`（仅摘要） | 高危 → **WARN**，不替代专业审计 |

## 执行步骤

1. `cd` 项目根，记录 **Node/Python 版本**（`node -v` 等）
2. 若有 `git`，记录 **对比基线**：`main...HEAD` 或当前分支 tip
3. 按探测顺序执行，**每项单独记录**（不要只跑最后一个）
4. 失败项：摘 **首条错误信息** + 文件路径（≤5 行）
5. 汇总 **Verdict**：`PASS` | `PASS_WITH_WARN` | `FAIL`
6. 将 BLOCK 项映射到建议阶段：`taiyi-dev` 切片 / 新开 bugfix slug

## health-report.md 模板

```markdown
# Health Report: <slug>

- 时间：ISO8601
- 分支 / commit：`…`
- 环境：node … / python …

## Summary

| 检查项 | 命令 | 退出码 | 级别 |
|--------|------|--------|------|
| build | `npm run build` | 0 | OK |
| test | `npm test` | 1 | **BLOCK** |

**Verdict:** FAIL — 1 BLOCK, 0 WARN

## BLOCK 详情

### test

\`\`\`
（首条失败摘要）
\`\`\`

**建议：** taiyi-dev 切片「修复 xxx 测试」

## WARN 详情

（若无则写 None）

## 与 TEST.md 交叉

- TEST.md 声明：…
- 本报告：一致 / 不一致（说明）
```

## 与主流程

- **不自动修复**：修复归属 `taiyi-dev`，health 只出报告
- `taiyi-review`：若 Verdict = `FAIL`，REVIEW Verdict 应为 **Request changes**，除非 BLOCK 已在新 commit 修复并附再跑证据
- `TEST.md` 须引用本报告日期或 CI run URL，满足 Superpowers `verification-before-completion`

## 质量自检

- [ ] 每条检查有**真实命令**，非「目测没问题」
- [ ] BLOCK/WARN 分级与项目 CI 政策一致（读 `.github/workflows`）
- [ ] 报告可在干净环境由他人复现（写明 install 前提：`npm ci`）

## 与铁三角

- **gstack `health`**：若本机有 gstack 聚合检查，可并列跑；结论合并进同一报告，注明来源
- **Superpowers `verification-before-completion`**：无退出码 0 证据不得宣称「测试已过」

## 禁止

- 为通过而改测试断言（除非 TASK 明确允许）
- 跳过 build 只跑 lint
- health 报告代替 `REVIEW.md` 安全审查
- 在 health Skill 内直接改业务代码（除修复明显错误配置如错误 script 名——且须记入报告）
