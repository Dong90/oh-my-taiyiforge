# 贡献指南

感谢参与 **TaiyiForge**（`oh-my-taiyiforge`）开源项目。

## 原则

- Skill 命名统一 **`taiyi-*`**，不要使用 `flow-*` 前缀
- 阶段契约以 **`docs/taiyi/phases.yaml`** 为准；`src/core/phase-registry.ts` **启动时读取 YAML**（勿再双写 TS 数组）
- 质量门禁以 **`docs/taiyi/quality-gate.yaml`** 为准；`quality-gate.ts` 启动时读取
- 斜杠目录以 **`docs/taiyi/commands.yaml`** 为准；`npm run generate:docs` 生成五类 `docs/taiyi/inc/*.generated.md`（含 delivery-chain、browser-e2e），并同步 `canonical-commands.md` 标记块
- 行为变更须 **先写/改测试**（`npm test`），再改实现（TDD）
- Claude 与 Codex 共用 `skills/`，勿写仅单端可用的硬编码路径

## 发布到 npm

```bash
npm login
npm publish --access public
```

`prepublishOnly` 会自动执行 `build` 与 `test`（含九阶段 E2E）。

## 本地开发

```bash
npm install
npm test
npm run test:watch
npm run dogfood
```

## 提交前检查

```bash
npm test
npm run taiyi -- phases
```

## 新增 Skill

1. 在 `skills/taiyi-<name>/SKILL.md` 添加 frontmatter `name: taiyi-<name>`
2. 登记 `docs/taiyi/skills-catalog.yaml`
3. 若属主流程九阶段之一，只改 `docs/taiyi/phases.yaml`（引擎自动加载）

## 行为

请遵循 [Contributor Covenant](https://www.contributor-covenant.org/) 精神，保持讨论对事不对人。
