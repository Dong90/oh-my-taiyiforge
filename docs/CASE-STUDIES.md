# 案例征集

TaiyiForge 用在真实项目中的效果如何？这里收集来自社区的使用案例。

---

## 投稿模板

```markdown
### [项目名称] — 一句话描述

- **使用场景**：大功能 / 小修复 / 日常迭代 / CI 集成
- **AI 终端**：Claude Code / Cursor / OpenCode / Codex
- **团队规模**：个人 / 2-5 人 / 5+ 人
- **使用周期**：X 周 / X 月
- **用之前**：（之前怎么做的，痛点是什么）
- **用之后**：（改用 TaiyiForge 后发生了什么变化）
- **一句话收获**：（最大的价值）
```

---

## 自己可以做的（零成本）

### 1. 自吃狗粮（dogfooding）

用 TaiyiForge 开发 TaiyiForge 本身。这是最真实、最有说服力的案例。

```bash
# 在当前仓库里用 TaiyiForge 做一个真实变更
cd oh-my-taiyiforge
/taiyi:new "添加某个功能"
# 走完整九阶段，记录每次 review 的 human gate 决策
```

**产出**：一份完整的工作流日志（CHANGE → CHANGELOG），直接贴到案例区。

### 2. 录制演示视频

在真实项目上用 `/taiyi:new` 走一个完整 change，录屏 + 旁白。

- 工具：QuickTime（Mac 自带）/ OBS
- 时长：3-5 分钟
- 内容：创建 change → 写工件 → 引擎推进 → human gate → 交付

### 3. 对比实验

同一个需求，分别用「直接跟 AI 对话」和 TaiyiForge 各做一次。记录：

| 维度 | 直接跟 AI 对话 | TaiyiForge |
|------|--------------|-----------|
| 耗时 | | |
| 来回次数 | | |
| review 退回次数 | | |
| 上下文丢失次数 | | |
| 产出质量（自评 1-10） | | |

---

## 去哪里找早期用户

### 目标人群
- 用 AI coding 工具做严肃项目的独立开发者
- 需要统一团队 AI 工作流的技术负责人
- OpenCode / Cursor / Claude Code 重度用户
- OMO / OMX 生态用户（已有编排概念）

### 渠道
| 渠道 | 怎么做 |
|------|-------|
| **GitHub Discussions** | 开一个 "Share Your Experience" 帖子 |
| **OpenCode Discord/社区** | 项目本身就是 OpenCode 插件，最相关 |
| **Claude Code 社区** | `/taiyi:*` slash 用户天然重合 |
| **v2ex / 掘金** | 中文 AI 编程话题下分享 |
| **X / Twitter** | @ClaudeCode、@cursor_ai 相关话题 |

### 接触话术

> 用 AI 写代码时遇到过这些问题吗？
> - Agent 跳过设计直接写代码
> - 长会话上下文全丢
> - 换工具就要换流程
>
> 试试 TaiyiForge——把九阶段工程流水线装进你的 AI 终端。
> 装了之后只用说 `/taiyi:new`，引擎带你走完全程。
>
> GitHub: https://github.com/Dong90/oh-my-taiyiforge

---

## 投稿方式

1. 在 [Discussions](https://github.com/Dong90/oh-my-taiyiforge/discussions) 发帖，标签选 "Show and tell"
2. 或直接 PR 到本文件，追加你的案例

---

## 案例列表

> 还没有案例？从自吃狗粮开始。把第一个案例贴到这里。
