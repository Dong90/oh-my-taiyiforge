---
description: "TaiyiForge /taiyi:help — v28 顶栏 + legacy 全量目录（`/taiyi:flow help` 同等）"
argument-hint: "[optional topic: scenarios|delivery|autonomous|gstack|superpowers|canonical|engine]"
---
User invoked **$taiyi-help** (= `/taiyi:help` 或 `/taiyi:flow help`)。**输出 v28 推荐顶栏（28 条）+ legacy 兼容清单**（真源：`docs/taiyi/commands.yaml` → `canonical_v28` · `slash_catalog`；表格由 `npm run generate:docs` 生成）。

**Cursor 输入**：文档写 `/taiyi:xxx`；四端 `/` 菜单均用 **`/taiyi-xxx`**（连字符，无冒号）— install 同步同源 `prompts/taiyi-*.md`。

若 `$ARGUMENTS` 为 `scenarios` | `delivery` | `autonomous` | `gstack` | `superpowers` | `canonical` | `engine`，**只展开对应节**；否则 **完整输出** + 建议 `/taiyi:status --json --compact`。

---

{{SLASH_CATALOG}}

## 已合并（勿用旧斜杠）

`pause`→handoff · `commit-trailers`→commit · `state`→status · `next`/`done`→continue · `change`…`integration`→**write**

## CLI vs 斜杠

| 类型 | 示例 | 说明 |
|------|------|------|
| 引擎 CLI + wrapper | `list [--archived]` · `prune` · `harness` · `token compress` · `doctor` | `./scripts/taiyi-forge.sh` 或 `npx taiyi`；`smoke-reset` **仅 wrapper** |
| 仅聊天斜杠 | `explore` · `flow` · `tdd` · `security` · `e2e` · `ui-test` · `release` · `ship` · `land` | CLI **exit 2**，须在 IDE 用 `/taiyi:<verb>` 加载 Skill |
| Legacy 别名 | `ls`→list · `check`→harness · `pause`→handoff | wrapper 与直连 CLI 均支持 |

## 后缀 xN

多数命令支持 `xN` / `--times N`（如 `/taiyi:continue x3`）；`complete` / `mark-aux` / `harness-check` 等须显式参数，不支持 xN。

## 更多

- 叙事版：`docs/taiyi/canonical-commands.md`
- 机器真源：`docs/taiyi/commands.yaml`

{{TAIYI_STAGE_PROTOCOL}}
