# minimal-project · TaiyiForge 从零到九阶段

空目录演示：**安装 → 自检 → 建变更 → 九阶段 → CI 验证**。

变更 slug：`minimal-demo` · 模式：`init --auto`（铁三角 + 辅助 Skill 门禁）

---

## 一、前置条件

| 项 | 要求 |
|----|------|
| Node.js | ≥ 20 |
| 仓库 | 已 clone `oh-my-taiyiforge` |
| 可选 | Cursor + Superpowers / gstack Skills（聊天路径需要） |

---

## 二、安装（三选一）

### A. 在本示例目录（推荐）

```bash
# 1. 先构建主仓库
cd /path/to/oh-my-taiyiforge
npm install && npm test

# 2. 进入空示例项目
cd examples/minimal-project
npm install          # 通过 file:../.. 链接 oh-my-taiyiforge

# 3. 四端 Skills + 控制面（Cursor / Claude / Codex / OpenCode）
cd ../..
npx taiyi-forge-install --all

# 4. 自检
../../scripts/taiyi-forge.sh doctor
```

### B. 任意新项目（npm 包）

```bash
mkdir my-app && cd my-app
npm init -y
npm install oh-my-taiyiforge
npx taiyi-forge-install --cursor    # 或 --all
npx taiyi doctor
```

### C. 全局 CLI

```bash
npm install -g oh-my-taiyiforge
taiyi-forge doctor
```

---

## 三、一键跑通（引擎路径 · 无需聊天）

在 `examples/minimal-project` 目录：

```bash
npm test                        # 先确认 counter 模块
npm run walkthrough             # = node scripts/run-full-flow.mjs
```

等价于逐步执行下面 **第四节** 的全部 shell 命令（含铁三角打卡）。

---

## 四、分步执行（引擎 shell · Agent 代跑）

所有命令在 **`examples/minimal-project`** 根目录执行：

```bash
export TAIYI_FORGE_ROOT=/path/to/oh-my-taiyiforge   # 可选，链本地开发包
FORGE=../../scripts/taiyi-forge.sh
SLUG=minimal-demo
```

| 步骤 | 命令 | 说明 |
|------|------|------|
| 0 | `$FORGE doctor` | 四端 Skills + 控制面 PASS |
| 1 | `$FORGE new "Minimal Counter Demo"` 或 `$FORGE init $SLUG --auto --title "..."` | 创建 `.taiyi/changes/$SLUG/` |
| 2 | `$FORGE status` | 当前阶段 1/9 |
| 3 | `$FORGE check $SLUG` | 查看 harness 清单（铁三角→辅助→主 Skill） |

### 阶段 ① change

| 步骤 | 动作 |
|------|------|
| 3a | 聊天加载 **Superpowers brainstorming**（或 `$FORGE harness-check $SLUG superpowers/brainstorming` 演示打卡） |
| 3b | 加载 **taiyi-intel-scan**，写 `CONTEXT.md` → `$FORGE mark-aux $SLUG taiyi-intel-scan` |
| 3c | 加载 **taiyi-change**，写 `CHANGE.md` |
| 3d | `$FORGE continue $SLUG` 或 `$FORGE complete $SLUG change` |

### 阶段 ②～⑤ 规划期（requirement → task）

每阶段循环：

1. `$FORGE status $SLUG` — 看当前 Skill
2. `$FORGE check $SLUG` — 铁三角清单
3. 聊天加载对应 **taiyi-requirement / taiyi-design / …**，写工件
4. 铁三角打卡（见下表）
5. `$FORGE continue $SLUG`

| 阶段 | 主 Skill | 工件 | 铁三角（--auto 必打卡） |
|------|----------|------|-------------------------|
| requirement | taiyi-requirement | REQUIREMENT.md | OpenSpec（可选，未装跳过） |
| design | taiyi-design | DESIGN.md + adr/ | gstack/plan-eng-review |
| ui-design | taiyi-ui-design | UI-DESIGN.md | — |
| task | taiyi-task | TASK.md | — |

### 阶段 ⑥⑦ 实现期（dev / test）

| 步骤 | 动作 |
|------|------|
| 6a | `$FORGE apply $SLUG` — 进入 dev |
| 6b | **Superpowers TDD** + **taiyi-dev**，写代码，`npm test` |
| 6c | 铁三角打卡 `superpowers/test-driven-development` |
| 6d | `$FORGE complete $SLUG dev` |
| 7a | **taiyi-test**，写 TEST.md + architecture-sync.md |
| 7b | 打卡 `superpowers/verification-before-completion` |
| 7c | `$FORGE apply $SLUG` 或 `$FORGE continue $SLUG` |

### 阶段 ⑧⑨ 收尾（review / integration）

| 阶段 | 主 Skill | 铁三角 |
|------|----------|--------|
| review | taiyi-review + taiyi-health | gstack/review |
| integration | taiyi-integration | gstack/document-release |

全部完成后：

```bash
$FORGE status $SLUG          # workflowStatus: completed
$FORGE archive $SLUG        # 归档（可选先 sync-openspec）
$FORGE ci verify --slug $SLUG
```

---

## 五、Cursor 聊天路径（OpenSpec 风格）

安装 `--cursor` 后，在 **minimal-project** 打开 Cursor，对 Agent 说：

```
/taiyi:new Minimal Counter Demo
/taiyi:status
```

然后每阶段：

1. 按 status 提示加载 **taiyi-* Skill** + 铁三角（Superpowers / gstack）
2. 写完工件 → `/taiyi:continue`
3. dev/test → `/taiyi:apply`
4. 九阶段完成 → `/taiyi:archive`

辅助命令：`/taiyi:doctor` · `/taiyi:list` · `/taiyi:check` · `/taiyi:sync` · `/taiyi:run`

详见 [docs/taiyi/workflow.md](../../docs/taiyi/workflow.md)

---

## 六、产出物

```
examples/minimal-project/
├── src/counter.js
├── test/counter.test.js
└── .taiyi/changes/minimal-demo/
    ├── state.json
    ├── .harness-checkpoints.json
    ├── CONTEXT.md
    ├── adr/001-counter-module.md
    ├── CHANGE.md … CHANGELOG.md
    ├── ui-restyle-tasks.md
    ├── architecture-sync.md
    ├── health-report.md
    └── .dev-complete
```

---

## 七、OpenSpec（可选）

若项目已装 [OpenSpec](https://github.com/Fission-AI/OpenSpec)：

```bash
$FORGE sync $SLUG
$FORGE archive $SLUG
```

未安装时 requirement / integration 的 OpenSpec 步骤自动跳过。

---

## 八、故障排查

| 现象 | 处理 |
|------|------|
| `doctor` FAIL | `npx taiyi-forge-install --all` 后重试 |
| continue 报多 slug | `$FORGE list`，或 `$FORGE continue minimal-demo` |
| complete 被 auto 拦住 | `$FORGE check $SLUG`，补铁三角打卡 + 辅助工件 |
| 找不到 taiyi | 设置 `TAIYI_FORGE_ROOT` 指向 oh-my-taiyiforge 根目录 |

更多：[QUICKSTART.md](../../docs/QUICKSTART.md) · [integrations.md](../../docs/taiyi/integrations.md)
