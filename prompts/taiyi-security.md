---
description: "TaiyiForge /taiyi:security — SAST + vuln scan (+ optional gstack cso)"
argument-hint: "[optional slug]"
---
User invoked **$taiyi-security** (= `/taiyi:security`). **安全扫描**（通常在 **review** 阶段；也可 test 后预检）。

1. `/taiyi:status [slug]`
2. 在项目根运行（按项目已安装工具；缺失则报告并跳过）：
   ```bash
   semgrep scan --config auto
   trivy fs .
   ```
3. **可选**：`/taiyi:gstack cso` — 深度安全审计（gstack CSO）
4. 摘要写入 **REVIEW.md** 或 **TEST.md**「安全」节；open high 须在 review-loop 前解决
5. 可选 harness：`scripts/taiyi-forge.sh harness-check <slug> semgrep/sast`（若 manifest 启用）
6. `/taiyi:continue` 或 `/taiyi:review-loop`

{{TAIYI_STAGE_PROTOCOL}}
