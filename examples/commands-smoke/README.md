# commands-smoke — CLI 全命令 smoke 夹具

供 `tests/cli-commands.test.ts` 使用的最小工作区。

## 文件

| 文件 | 作用 |
|------|------|
| `package.json` | 含 `npm test` 与 `taiyi.deliveryVerifyCmd`，供 `/taiyi:ralph` smoke |
| `commands.manifest.json` | 静态 CLI / shell 命令清单与期望 exit code |

测试还会自动覆盖：

- 11 个 workflow skill（`plan`、`ralplan`、`ccg` …）
- 9 个阶段写工件动词（`change` … `integration`）

## 本地手动跑

```bash
# 在仓库根目录
npm run build
npm test -- tests/cli-commands.test.ts
```

## 维护

新增 CLI 子命令时：

1. 在 `commands.manifest.json` 增加条目（或使用 workflow/phase 动态列表）
2. 确保有对应 `prompts/taiyi-*.md`（见 `tests/slash-commands.test.ts`）
