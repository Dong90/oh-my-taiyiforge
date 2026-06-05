# 贡献指南

感谢参与 **TaiyiForge**（`oh-my-taiyiforge`）开源项目。

## 原则

- Skill 命名统一 **`taiyi-*`**，不要使用 `flow-*` 前缀
- 阶段契约以 `docs/taiyi/phases.yaml` 与 `src/core/phase-registry.ts` 为准，改一处须同步另一处
- 行为变更须 **先写/改测试**（`npm test`），再改实现（TDD）
- Claude 与 Codex 共用 `skills/`，勿写仅单端可用的硬编码路径

## 本地开发

```bash
npm install
npm test
npm run test:watch
```

## 提交前检查

```bash
npm test
npm run taiyi -- phases
```

## 新增 Skill

1. 在 `skills/taiyi-<name>/SKILL.md` 添加 frontmatter `name: taiyi-<name>`
2. 登记 `docs/taiyi/skills-catalog.yaml`
3. 若属主流程九阶段之一，同步 `src/core/phase-registry.ts` 与 `docs/taiyi/phases.yaml`

## 行为

请遵循 [Contributor Covenant](https://www.contributor-covenant.org/) 精神，保持讨论对事不对人。
