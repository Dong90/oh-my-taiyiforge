<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-doctor.md -->
---
description: "TaiyiForge /taiyi:doctor — install + workspace self-check"
argument-hint: "optional flags: --json --compact --strict-workspace"
---
User invoked **$taiyi-doctor** (= `/taiyi:doctor`). Run:

```bash
scripts/taiyi-forge.sh doctor $ARGUMENTS
```

**安装与消费方自检**（Skill 四端、prompt 同步、工作区 `.taiyi/` 健康）。Agent 默认加 `--json --compact`，只摘失败项，勿全量 dump。

对照：`/taiyi:verify` = 工件门禁 · `/taiyi:audit` = 交付漂移+git · `/taiyi:doctor` = 安装+工作区

## Agent 协议（必须遵守）

1. 代跑 `scripts/taiyi-forge.sh doctor --json --compact`（用户未禁用时）。
2. 只向用户汇报 **失败项 / high findings**；通过项一行带过即可。
3. 修复建议指向 `npx taiyi-forge-install --all` 或具体缺失路径，勿让用户手打裸 shell（除 install 一行命令）。
4. 用户只说 **`/taiyi:*` 斜杠**；禁止声称「已 doctor」而未实际跑命令。

{{TAIYI_STAGE_PROTOCOL}}
