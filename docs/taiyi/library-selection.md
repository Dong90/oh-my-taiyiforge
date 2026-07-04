# 第三方库去重选型（只留最强）

> 真源：`workflow-manifest.yaml`（harness 硬约束）· `capabilities`（引擎/Agent 单轨）· 本表说明**为何**去掉重复项。

## 保留的三层 + CLI

| 层 | 库 | 保留原因 |
|----|-----|----------|
| 纪律 | **Superpowers** | 流程硬约束：brainstorming · writing-plans · TDD · 证据门禁 · 派审 · 分支收尾 · subagent 编排 |
| 深度 | **ECC** | 架构审计 · 栈 patterns · UI/a11y 深度 · 覆盖率/Eval · AgentShield · Continuous Learning · CHANGELOG/压缩 |
| 引擎 | **OpenSpec / Playwright / Changesets** | 无 LLM、可复现 CLI：`spec_*` · `e2e_test` · `version_release` |

**GStack 已退出主链路**（不再安装、不进 manifest）。发版文档 → `taiyi-integration` + ECC `changelog-generator`；会话续作 → `/taiyi:handoff` + ECC `strategic-compact`。

## 已移除 / 不再进 manifest 的重复

| 重叠域 | 去掉 | 留下 | 理由 |
|--------|------|------|------|
| 工程架构评审 | GStack `plan-eng-review` · `cap/eng_review` | ECC `architecture-audit` | 深度多维 + adr 沉淀 |
| 系统设计第二遍 | ECC `system-design-review` | ECC `architecture-audit` | 同阶段合并为一次深度审计 |
| UI 设计快评 | GStack `plan-design-review` · `cap/design_review` | ECC `web-design-guidelines` + `frontend-patterns` | 规范库 + 栈 patterns 更全 |
| 无障碍 | web-quality `accessibility` · `cap/accessibility` | ECC `accessibility-audit` | 审计流程更深 |
| 界面规范 | web-quality `design_guidelines` · `cap/design_guidelines` | ECC `web-design-guidelines` | 与 UI 阶段合并 |
| TDD  playbook | ECC `tdd-workflow`（task/dev） | Superpowers `test-driven-development` | 纪律层不可双轨 |
| 验证闭环 | ECC `verification-loop` | Superpowers `verification-before-completion` + ECC `test-coverage-analysis` · `eval-harness` | 门禁归 SP，分析归 ECC |
| 科学调试 | ECC `systematic-debugging` | Superpowers `systematic-debugging`（可选） | 同名能力，留 SP 生态 |
| 站点 QA | GStack `qa` · `cap/browser_qa` | Playwright `cap/e2e_test` | 引擎 CLI 证据更可复现；Agent 深度测由 ECC coverage/eval 补 |
| PR 结构审查 | GStack `review` · `cap/code_review` | Superpowers `requesting-code-review` + ECC `security-scan` | 流程派审 + 深度安全 |
| 发版文档 | GStack `document-release` · `cap/doc_release` | `taiyi-integration` + ECC `changelog-generator` | 工件契约 + commits 草稿 |
| 会话 checkpoint | GStack `checkpoint` | `/taiyi:handoff` · 引擎 token compress · ECC `strategic-compact` | 无额外依赖 |
| SAST/漏洞 CLI | Semgrep · Trivy · `cap/sast_scan` · `cap/vuln_scan` | ECC `security-scan`（AgentShield） | 1282 rules 覆盖 agent 侧安全主路径 |
| 威胁建模第二遍 | ECC `security-review` | ECC `security-scan` | 合并为一次 AgentShield 硬约束 |
| 切片编码规范 | ECC `coding-standards`（task） | ECC `coding-standards`（design/dev  only） | 避免 task/dev 双打卡 |

## 九阶段最终清单（去重后）

| 阶段 | Superpowers | ECC | capabilities (CLI/单轨) |
|------|-------------|-----|---------------------------|
| change | brainstorming | continuous-learning | — |
| requirement | writing-plans（可选） | iterative-retrieval | spec_sync? |
| design | — | architecture-audit · backend-patterns · coding-standards | — |
| ui-design | — | web-design-guidelines · accessibility-audit · frontend-patterns | — |
| task | writing-plans · TDD | — | — |
| dev | TDD · subagent-driven-development | coding-standards · backend-patterns · golang-*（可选） | — |
| test | verification-before-completion | test-coverage-analysis · eval-harness | e2e_test |
| review | requesting-code-review | security-scan | — |
| integration | finishing-branch · verification | changelog-generator · strategic-compact · continuous-learning-v2 | spec_archive · version_release |

覆盖回退：编辑 `.taiyi/providers.yaml` 的 `assignments` 可恢复 GStack/Semgrep 等（见 `providers.yaml` 注释）。
