# 发布 checklist（v0.24+ 上 npm 前必看）

> **目的**：把"`v0.23.0` 还没上 npm" → "v0.24.0 已上 npm"的迁移成本压到一行 commit。

## 1. 预发布（prepublish）

```bash
npm run build           # tsc → dist/
npm test                # Vitest + 九阶段 E2E
npm run check:docs      # 文档与 commands.yaml 同步
npm run ci:platforms    # 四端冒烟（opencode / claude / codex / cursor）
```

`prepublishOnly` 会自动跑前三条。

## 2. npm 登录

```bash
npm login               # 一次性，写入 ~/.npmrc
npm whoami              # 确认身份
```

## 3. 首次发布

```bash
npm publish --access public
```

如果包名被占，编辑 `package.json` 的 `name` 字段（scope: `@<org>/oh-my-taiyiforge`），重新 `npm install`。

## 4. 同步 README badge（**这一行 commit 必做**）

打开 `README.md`，把这一行：

```markdown
[![Version](https://img.shields.io/badge/version-${VERSION}-orange)](CHANGELOG.md)
```

替换为：

```markdown
[![npm version](https://img.shields.io/npm/v/oh-my-taiyiforge.svg)](https://www.npmjs.com/package/oh-my-taiyiforge)
[![npm downloads](https://img.shields.io/npm/dm/oh-my-taiyiforge.svg)](https://www.npmjs.com/package/oh-my-taiyiforge)
```

并把 `Quick Start` 区从「源码安装」切回「npm 一行」：

```diff
-### 方式 A：源码安装（推荐，现在就用）
-...
+### Quick Start
+```bash
+npm install oh-my-taiyiforge
+npx taiyi-forge-install --all
+npx taiyi doctor --strict-workspace
+```
```

## 5. 打 tag + Release

```bash
git tag v0.24.0
git push origin v0.24.0
# GitHub → Releases → Draft new release → 选 tag → 写 changelog → Publish
```

## 6. 验证

- [ ] `npm view oh-my-taiyiforge` 能看到版本
- [ ] `npx oh-my-taiyiforge --version` 在干净环境跑得通
- [ ] README 顶栏徽章绿了
- [ ] GitHub Release 通知到 watch 用户

## 7. 删「未到位」字样

在 README 的「路线图与状态」一节，把「npm 一键安装（v0.24 目标）」从「未到位」挪到「已可用」。
