## Agent 协议（必须遵守）

1. 只处理 **当前阶段** 工件（以 `status` 的 Skill/artifact 为准）；勿跳步写后续阶段 md。
2. **dev/test 之前禁止改业务代码**（`src/`、`app/` 等）；规划阶段只写 `.taiyi/changes/<slug>/` 下 md。
3. 每步：`status` → 用户确认 → `continue --approver 名`（change/design/review 人工门）。
4. 以 `status` 引擎输出为准；勿凭聊天记忆声称「已完成」。
5. 全自动须显式 `new … --auto` 或 `TAIYI_AUTO_HARNESS=1`；**默认手动九阶段**。
