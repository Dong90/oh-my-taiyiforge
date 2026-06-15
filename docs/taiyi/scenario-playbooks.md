# Taiyi 场景 Playbook

按项目类型选路径；引擎通过 **profile** 跳过阶段，通过 **`.taiyi/config.json`** 调交付门与默认 profile。

## 快速选型

| 你在做什么 | 命令 | profile | 阶段链 |
|-----------|------|---------|--------|
| 后端 / 服务长期演进 | `/taiyi:service` | `api` | 九阶段 − ui-design |
| 设计系统 / 组件库 | `/taiyi:design-system` | `ui` | 完整九阶段（UI harness 优先） |
| 创业 MVP / 验证想法 | `/taiyi:mvp` | `spike` | change → dev → test → integration |
| 个人脚本 / 小工具 | `/taiyi:micro` | `micro` | change → dev → integration |
| 修 Bug | `/taiyi:bug` | `lite` | change → requirement → dev → test → integration |
| 大功能 | `/taiyi:feature` | `full` | 完整九阶段 |
| 已有 CI，只要追溯 | `/taiyi:flow devops` | — | `taiyi ci verify` + 配置见下 |

总览表：`npm run taiyi -- flow`

## 项目配置 `.taiyi/config.json`

```json
{
  "scenario": "mvp",
  "defaultProfile": "spike",
  "deliveryGate": false,
  "commitTrailers": false,
  "deliveryVerifyCmd": "npm test"
}
```

| 字段 | 作用 |
|------|------|
| `defaultProfile` | `new` / `init` 未写 `--profile` 时的默认值 |
| `deliveryGate` | `false` 关闭 integration 交付门（env `TAIYI_DELIVERY_GATE` 仍可覆盖） |
| `deliveryVerifyCmd` | integration 前跑的验证命令（优先级：env > config > package.json） |
| `commitTrailers` | `false` 关闭 Taiyi-Change trailer 检查 |
| `scenario` | 推荐场景：`service` · `design-system` · `mvp` · `micro` · `nano` · `devops` |

### 各场景推荐配置

**后端服务**

```json
{
  "scenario": "service",
  "defaultProfile": "api",
  "deliveryVerifyCmd": "npm test"
}
```

**设计系统**

```json
{
  "scenario": "design-system",
  "defaultProfile": "ui"
}
```

**创业 MVP**

```json
{
  "scenario": "mvp",
  "defaultProfile": "spike",
  "deliveryGate": false
}
```

**个人工具**

```json
{
  "scenario": "micro",
  "defaultProfile": "micro",
  "deliveryGate": false,
  "commitTrailers": false
}
```

**成熟 DevOps（不重复 CI）**

```json
{
  "scenario": "devops",
  "deliveryGate": false,
  "commitTrailers": false,
  "deliveryVerifyCmd": "npm run ci:verify"
}
```

日常：`npm run taiyi -- ci verify` · 需要追溯时再开 `micro` / `lite` 变更。

## Profile 阶段跳过

| profile | 跳过 | 有效阶段数 |
|---------|------|-----------|
| full | — | 9 |
| api | ui-design | 8 |
| ui | — | 9 |
| lite | design, ui-design, task, review | 5 |
| spike | requirement, design, ui-design, task, review | 4 |
| micro | requirement, design, ui-design, task, test, review | 3 |

真源：`docs/taiyi/workflow-manifest.yaml` · `src/core/profile.ts`

## CLI 示例

```bash
# 场景 playbook（不创建变更，只打印路径）
npm run taiyi -- flow
npm run taiyi -- flow mvp
npm run taiyi -- mvp "用户 onboarding" --create

# 按场景创建变更
npm run taiyi -- new "导出修复" --profile lite
npm run taiyi -- new "CLI 工具" --profile micro
```

## 与 OpenSpec / 归档

- `spike` / `micro` 仍可在 integration 后 `/taiyi:archive`；OpenSpec 项目会自动 sync。
- 归档成功消息会根据是否执行 OpenSpec 区分（见 `formatTaiyiArchivePlain`）。
