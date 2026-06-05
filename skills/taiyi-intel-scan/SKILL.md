---
name: taiyi-intel-scan
description: TaiyiForge 辅助 — 代码库情报扫描，产出 CONTEXT.md（变更前可选）。
---

# taiyi-intel-scan

## 何时使用

- 新 slug 启动前，或 `taiyi-assess` 建议复杂度较高时

## 输出

- `.taiyi/changes/<slug>/CONTEXT.md` 或项目 `.taiyi/CONTEXT.md`

## 内容要点

1. 相关目录与入口文件
2. 现有模式（命名、测试框架、API 风格）
3. 风险区（遗留代码、无测试模块）
4. 建议先读的 3–5 个文件

## 注意

- 只读扫描，不在此 Skill 内改业务代码
