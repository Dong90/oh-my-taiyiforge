# 贡献指南

感谢参与 **TaiyiForge**（`oh-my-taiyiforge`）开源项目。

## 分支策略（Git Flow）

```
main     ← 受保护 · 只接受 develop 的定期合并 · 与 npm latest 对齐
  ↑
develop  ← 受保护 · 所有 PR 的目标分支 · 集成测试通过的代码
  ↑
feat/* · fix/* · docs/* · chore/* · ci/*  ← 你的工作分支
```

**铁律**：

- 外部贡献者：fork → 从 `develop` 切分支 → PR base 选 `develop`
- 维护者：本地从 `develop` 切分支 → PR base 选 `develop`
- **直接打到 `main` 的 PR 会被关闭**，请重开到 `develop`
- `main` 由维护者定期从 `develop` 合并并发版到 npm

### 分支命名

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feat/` | 新功能 | `feat/add-mcp-tool` |
| `fix/` | 修 bug | `fix/cli-exit-code` |
| `docs/` | 只改文档 | `docs/contributor-guide` |
| `chore/` | 杂项（依赖升级、配置） | `chore/bump-vitest` |
| `ci/` | CI / 构建 | `ci/add-coverage` |
| `refactor/` | 重构（不改行为） | `refactor/extract-helper` |

## 外部贡献者：完整 PR 流程

```bash
# 1. 在 GitHub 网页点 Fork 按钮，fork 这个仓库到你自己账号

# 2. clone 你的 fork（替换 <your-username>）
git clone https://github.com/<your-username>/oh-my-taiyiforge.git
cd oh-my-taiyiforge

# 3. 加 upstream 指向原仓库（保持同步用）
git remote add upstream https://github.com/Dong90/oh-my-taiyiforge.git

# 4. 从 upstream/develop 切分支
git fetch upstream
git checkout -b feat/my-feature upstream/develop

# 5. 装依赖、跑测试，确认本地干净
npm install
npm test

# 6. 写代码 → commit（消息见下方约定）
git add .
git commit -m "feat: 简短描述"

# 7. push 到你的 fork
git push origin feat/my-feature

# 8. 在 GitHub 网页开 PR
#    base repo: Dong90/oh-my-taiyiforge   base: develop  ← 务必选 develop
#    head repo: <your-username>/oh-my-taiyiforge   compare: feat/my-feature
```

### Fork 同步上游（长期开发必备）

如果你的 fork 落后于上游 develop：

```bash
git fetch upstream
git checkout develop
git merge upstream/develop  # 或 git reset --hard upstream/develop（如果你的 develop 没改过）
git push origin develop
```

## 维护者：本地开发流程

```bash
git checkout develop
git pull
git checkout -b feat/my-feature
# ... 开发 ...
git push -u origin feat/my-feature
gh pr create --base develop --title "feat: ..."
```

## Commit 消息约定

参考 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <短描述>

<可选正文，说明为什么这么改>

<可选 footer，如 Taiyi-Change: <slug>>
```

常用 `type`：`feat` / `fix` / `docs` / `chore` / `refactor` / `test` / `ci` / `perf`。

## 原则（代码层面）

- Skill 命名统一 **`taiyi-*`**，不要使用 `flow-*` 前缀
- 阶段契约以 **`docs/taiyi/phases.yaml`** 为准；`src/core/phase-registry.ts` **启动时读取 YAML**（勿再双写 TS 数组）
- 质量门禁以 **`docs/taiyi/quality-gate.yaml`** 为准；`quality-gate.ts` 启动时读取
- 斜杠目录以 **`docs/taiyi/commands.yaml`** 为准；`npm run generate:docs` 生成五类 `docs/taiyi/inc/*.generated.md`（含 delivery-chain、browser-e2e），并同步 `canonical-commands.md` 标记块
- 行为变更须 **先写/改测试**（`npm test`），再改实现（TDD）
- Claude 与 Codex 共用 `skills/`，勿写仅单端可用的硬编码路径

## 发布到 npm（仅维护者）

```bash
npm login
npm version patch   # 或 minor / major
npm publish --access public
git push --follow-tags
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
npm run check:docs
npm run taiyi -- phases
npm run taiyi:doctor      # 等价于 npx taiyi doctor --strict-workspace，但用仓库内 tsx 跑
```

## 新增 Skill

1. 在 `skills/taiyi-<name>/SKILL.md` 添加 frontmatter `name: taiyi-<name>`
2. 登记 `docs/taiyi/skills-catalog.yaml`
3. 若属主流程九阶段之一，只改 `docs/taiyi/phases.yaml`（引擎自动加载）

## 行为准则

请遵循 [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)，保持讨论对事不对人。

## 安全问题

发现漏洞请**不要**开公开 Issue，参见 [`SECURITY.md`](./SECURITY.md) 的私下披露流程。
