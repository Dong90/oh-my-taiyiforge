# PITFALLS — 全局坑位索引

> 项目级常驻文件。位置：`.pitfalls/GLOBAL.md`
> 每个 task 开工前：先读本文件（跨模块流程规则），再读触达模块的 `PITFALLS.md`。

## 标签索引

| 标签 | 含义 |
|------|------|
| `arch` | 架构决策 |
| `lib` | 第三方库选型/陷阱 |
| `tool` | 构建/测试/工具链 |
| `data` | 数据建模/迁移 |
| `perf` | 性能 |
| `sec` | 安全 |
| `ux` | 交互/视觉 |
| `ops` | 部署/运维 |
| `process` | 流程/工作流 |

## 模块 PITFALLS 文件清单

| 文件 | 覆盖 |
|------|------|
| `.pitfalls/GLOBAL.md` | 本文件 — 跨模块流程规则 + 格式定义 |
| `src/core/PITFALLS.md` | 工作流引擎 / 状态机 / 阶段逻辑 |
| `src/cli/PITFALLS.md` | CLI 参数 / 命令注册 |
| `src/templates/PITFALLS.md` | Handlebars 模板 / 渲染 |
| `src/schemas/PITFALLS.md` | Zod schema 校验 |
| `src/install/PITFALLS.md` | Skill 同步 / 安装 |
| `src/integrations/PITFALLS.md` | OpenSpec / MCP / 外部集成 |
| `.pitfalls/rules/` | ast-grep 自动扫描规则（CI 自动运行） |

## 使用规则

### 开工前（TASK 阶段 / 写代码前）

1. 读本文件，检查是否命中任何 GLOBAL 条目
2. 读触达模块的 `PITFALLS.md`（如 task 涉及 `src/core/` 和 `src/cli/`，读两份）
3. 运行 `.pitfalls/scan.sh` 进行 ast-grep 自动模式扫描
4. 命中条目 → 在实现方案里显式声明：「已查阅 P-XXX，已避开」

### 踩坑后（integration 归档时）

按「入库条件」追加到对应模块的 PITFALLS.md。跨模块的追加到本文件。

## 条目格式

```markdown
### P-XXX · [tag] 标题（一行说清）

- **首发**: <change-id> · <日期>
- **适用栈**: <例 React 18+ / Node 20>
- **状态**: active / resolved:<原因> / superseded-by:P-XXX
- **关键词**: <空格分隔，方便 grep>

**问题场景**
<什么情况下会想用被否决的方案>

**试过的方案**
<具体写法>

**为什么不行**
<可量化的失败原因，含错误信号/度量/链接>

**正确做法**
<当前推荐方案或指向 DESIGN/ADR>

**何时重新评估**
<升级后 / lib 修了 #N / 引入新基础设施后>
```

## 入库条件（满足任一）

- 调试/试错耗时 > 30 分钟
- 其他 task 也会撞上的坑
- 未来 6 个月有合理概率被再次尝试
- 否决理由不记下来就会丢失

**不进库的**：一次性的拼写错误、项目独有的业务规则（进 CONTEXT 已锁决策）、已在 ADR 里详细写过的架构权衡。

---

## GLOBAL 条目区（跨模块流程规则）

### G-001 · [process] 周五下午 4 点后不发版

- **首发**: N/A · 2024-01-01
- **适用栈**: all
- **状态**: active
- **关键词**: deploy friday release safety

**问题场景**
周五下午修复了一个小 bug，顺手发版。

**试过的方案**
直接 `npm publish` + merge。

**为什么不行**
若引入回归，周末无人值班响应。即使 CI 全绿，生产环境与测试环境的行为差异可能在数小时后才暴露。

**正确做法**
- 周五只做代码合并（merge），不发版（publish）。周一早上发。
- 紧急 hotfix 除外（需 Tech Lead 审批 + 全员 on-call 确认）。

**何时重新评估**
引入 24/7 SRE 值班制后。

### G-002 · [process] `npm audit` 必须先过再发版

- **首发**: N/A · 2024-01-01
- **适用栈**: Node 20+
- **状态**: active
- **关键词**: npm audit security release

**问题场景**
功能 PR 通过 review，直接发版，跳过安全审计。

**试过的方案**
CI 中 `npm audit --production` 仅 warn 不 block。

**为什么不行**
`npm audit` 报告 critical/high 的漏洞可能在数天内被利用（如原型污染、ReDoS），且 npm 生态中供应链攻击频率逐年上升。

**正确做法**
- CI 中 `npm audit --audit-level=high` exit code ≠ 0 则 block 发版
- 无法修复的漏洞：在 `.nsprc` 中登记 + 注明原因 + 设定复查日期

**何时重新评估**
引入 Snyk / Dependabot 自动升级后。

### G-003 · [process] CI 全绿 + E2E 通过才有 merge 资格

- **首发**: N/A · 2024-01-01
- **适用栈**: all
- **状态**: active
- **关键词**: ci merge gate e2e

**问题场景**
本地跑通 → 直接 push → CI 挂了 → 回滚。或 CI 挂了但 "看起来不相关" 直接 merge。

**试过的方案**
跳过 CI 合并小改动。

**为什么不行**
"看起来不相关"的 CI 失败往往是真实问题——测试间有隐式依赖、状态残留、或环境差异。跳过 CI 的 PR 多次导致 main 分支 broken。

**正确做法**
- 启用 branch protection: require status checks
- 任何 CI 失败（包括 flaky）必须先修再 merge
- flaky 测试：标记 `.skip` 或 `.todo` 并建 issue 追踪

**何时重新评估**
CI 稳定性 > 99.9% 时。

---

## 维护

- **每个 archive 顺手做**：检查 `package.json`/DB schema 大版本变化，把适用栈已不匹配的标 `resolved`
- **替代标记**：新条目对旧条目形成更优替代时标 `superseded-by:P-XXX`，不删
- **季度清理**：resolved > 6 个月的移到 `.pitfalls/archive/`
