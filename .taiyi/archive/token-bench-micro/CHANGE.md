# CHANGE: token-bench-micro

## Motivation

需要准确测量 TaiyiForge 各阶段在 micro profile 下的逐阶段 token 消耗（artifact 文件大小估算 + agent LLM 调用）。当前 token 预算表仅有设计值，缺乏真实运行数据。

## Scope

- In: 创建 CHANGE.md / 开发一个最小命令行脚本 / 生成 CHANGELOG.md
- Out: 不修改引擎代码，不涉及 UI 变更

## Risks

脚本执行依赖本地 Node.js 环境，tokens 估算受文件编码影响，但 artifact size 测量方法对同一文件一致。

## Success Criteria

- [x] change 阶段 PASS
- [x] dev 阶段 PASS  
- [x] integration 阶段 PASS
- [x] 输出每阶段 .md 文件 tokens 汇总
