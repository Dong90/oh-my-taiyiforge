---
description: "TaiyiForge /taiyi:audit — workflow & delivery bug hunt (not install doctor)"
---
User invoked **/taiyi:audit**. Run:

```bash
scripts/taiyi-forge.sh audit $ARGUMENTS --json --compact
```

Parse **`ok`**, **`highCount`**, **`findings[]`** (high only). Human summary: omit `--json`.

排查流程/交付闭环问题（非 `/taiyi:doctor` 安装自检）：
- legacy state.json（complete / string complexity）
- 工件质量 / harness 阻塞
- CHANGE checkbox 与 CHANGELOG 漂移
- integration 已过关但 git 未交付
- OpenSpec 目录缺失

对照：`doctor`=安装 · `verify`=PR工件门禁 · `audit`=交付与漂移
