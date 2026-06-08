# 架构图三步流水线

> 一条真源、顺序执行 — 避免 C4 / arch / render 各扫一遍代码产出三套图。

## 斜杠命令

| 步骤 | 命令 | 产出 |
|------|------|------|
| 1 C4 真源 | `/taiyi:diagram-c4 [slug] [--repo] [--scope path]` | `c4/README.md` + `context.md` + `containers.md` |
| 2 工程图 | `/taiyi:diagram-arch [slug] [topic]` | `diagrams/architecture.md`（链接 c4，补 L3/时序） |
| 3 导出图 | `/taiyi:diagram-render [slug] [--repo] [--review]` | `c4/png/*.svg`（C4）；可选 `diagrams/png/`（工程图） |
| **总编排** | `/taiyi:diagram-pipeline [slug] [--repo] [--scope] [--skip-render] [--review]` | ①→②→③ 顺序执行 |

Codex：`$taiyi-diagram-c4` · `$taiyi-diagram-render` · `$taiyi-diagram-pipeline`

## 路径约定

### 变更内（九阶段 design）

```text
.taiyi/changes/<slug>/diagrams/
  c4/README.md · context.md · containers.md   # ① 真源
  architecture.md                             # ② 工程补充（不重复 c4 Mermaid）
  c4/png/*.svg                                # ③ C4 预览
  png/*.svg                                   # ③ 可选：architecture.md 导出
```

### 仓库级（维护 oh-my-taiyiforge 文档）

```text
docs/c4/                    # ① 真源
docs/diagrams/architecture.md   # ② 工程补充
docs/c4/png/*.svg           # ③ C4 预览（主维护）
docs/diagrams/png/*.svg     # ③ 可选：architecture 时序图
```

**分工**：C4 L1/L2 只在 `docs/c4/*.md` 维护；`architecture.md` 只放 L3 组件、九阶段时序、安装图，通过链接引用 c4。

`--repo` 时不写 mark-aux；变更内完成后：

```bash
scripts/taiyi-forge.sh mark-aux <slug> taiyi-diagram-c4
scripts/taiyi-forge.sh mark-aux <slug> taiyi-diagram-arch
scripts/taiyi-forge.sh mark-aux <slug> taiyi-diagram-render
```

`mark-aux taiyi-diagram-render` 以 `diagrams/c4/png/context.svg` 为完成信号（不再使用 `RENDER.md`）。

## 示例

```text
# 维护本仓库文档
/taiyi:diagram-pipeline --repo --scope src/core

# design 阶段变更内
/taiyi:diagram-pipeline my-feature

# 只要 C4 + architecture，暂不导出
/taiyi:diagram-pipeline my-feature --skip-render

# 导出 + 视觉审查（需 diagramming-architecture skill）
/taiyi:diagram-pipeline --repo --review
```

## 与 diagram-flow 分工

| 命令 | 回答的问题 |
|------|------------|
| `/taiyi:diagram-pipeline` | **模块**有哪些、文档与 SVG 如何一条链产出 |
| `/taiyi:diagram-flow` | **步骤**怎么走、门禁何时拦住 |

产品海报仍用 `python3 scripts/generate-architecture-svg.py` → `docs/taiyiforge-architecture.png`。  
视觉架构稿（非真源）：`docs/diagrams/visual/architecture-vercel-mesh.html`（Vercel Mesh）· `architecture-poster.html`（暗色 Forge）。

## 可选开源 Skill

| 步骤 | 增强 |
|------|------|
| 1 | [c4-codebase-architecture-skill](https://github.com/lmammino/c4-codebase-architecture-skill) |
| 3 `--review` | [architecture-diagram-skill](https://github.com/robertanton81/architecture-diagram-skill) |

未安装时由 TaiyiForge 内置 Skill + `scripts/render-mermaid.mjs` 完成同等流程。

## 导出图（render 步骤）

默认 **SVG**（矢量、可缩放）；需要位图时加 `--format png`。

```bash
# C4 真源 → docs/c4/png/（每个 md 单独跑）
node scripts/render-mermaid.mjs docs/c4/context.md --format svg --out docs/c4/png/
node scripts/render-mermaid.mjs docs/c4/containers.md --format svg --out docs/c4/png/

# 工程补充图（可选，勿写入 c4/png/）
node scripts/render-mermaid.mjs docs/diagrams/architecture.md \
  --format svg --out docs/diagrams/png/
```

### 渲染参数（已内置默认值）

| 参数 | 默认 | 说明 |
|------|------|------|
| `--width` | 3200 | 视口宽 |
| `--height` | 2400 | 视口高 |
| `--scale` | 2 | PNG 清晰度倍数 |
| `--background` | `#ffffff` | 白底（避免透明发黑） |
| `--config` | `scripts/mermaid-arch-config.json` | flowchart 主题 |

### macOS：Chrome 未找到

```bash
export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
node scripts/render-mermaid.mjs docs/c4/containers.md --format svg --out docs/c4/png/
```

或：`npx puppeteer browsers install chrome-headless-shell`

## Skill 文件

- `skills/taiyi-diagram-c4/SKILL.md`
- `skills/taiyi-diagram-arch/SKILL.md`
- `skills/taiyi-diagram-render/SKILL.md`
- `skills/taiyi-diagram-pipeline/SKILL.md`
