---
description: "TaiyiForge /taiyi:health — review 前代码健康基线（taiyi-health Skill）"
argument-hint: "optional slug"
---
User invoked **/taiyi:health**. Run: `scripts/taiyi-forge.sh health [slug]`

**CLI 只输出 Agent 协议，不跑 lint/测试、不写 health-report.md。** 你必须在聊天内执行下列步骤：

1. Load **`taiyi-health`** — 类型/lint/测试/构建，用命令输出说话。
2. 写入 `.taiyi/changes/<slug>/health-report.md`（Verdict: PASS | PASS_WITH_WARN | FAIL）。
3. 完成后: `scripts/taiyi-forge.sh mark-aux <slug> taiyi-health`（medium/high complexity 在 review 过关前必选）。
4. 再进入 `taiyi-review` / `gstack review`。

若用户给了 slug 参数，使用该 slug；否则引擎从单变更推断。
