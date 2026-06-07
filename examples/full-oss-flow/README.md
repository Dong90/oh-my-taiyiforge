# 完整开源流程演示

用 **全部开源 Skill/CLI** 跑通 TaiyiForge 九阶段。

## 包含

| 层 | 工具 |
|----|------|
| 纪律 | Superpowers 14 技能 |
| 工件 | taiyi-change … taiyi-integration + 辅助 Skill |
| 评审/QA | gstack plan-eng/design-review · qa · review · document-release |
| 规格 | OpenSpec |
| 质量 | web-quality accessibility · web-design-guidelines |
| 测试 | Vitest/Jest · Playwright（可选打卡） |
| 安全 | Semgrep · Trivy（可选打卡） |
| 发布 | Changesets（可选打卡） |

## 运行

```bash
cd oh-my-taiyiforge
npm run build
node examples/full-oss-flow/scripts/run-full-oss-flow.mjs
```

聊天里跟跑：`/taiyi:full-flow` → Agent 按 [full-oss-flow.md](../../docs/taiyi/full-oss-flow.md) 逐步执行。

## 文档真源

- [docs/taiyi/full-oss-flow.md](../../docs/taiyi/full-oss-flow.md)
- [docs/taiyi/workflow-manifest.yaml](../../docs/taiyi/workflow-manifest.yaml)
