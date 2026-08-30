# 常见场景速查

> 不知道用哪个 profile？看这里。**默认是 nano**，两阶段零门槛。

---

## 我要修个 typo / 改一行代码

```bash
taiyi new "修复登录页 typo"
# → nano profile（默认），2 个阶段：dev → integration
# 不需要写 CHANGE.md、不需要 review，改完就走
```

---

## 我要加个小功能

```bash
taiyi new "给用户中心加头像上传" --profile=lite
# → lite profile，5 个阶段：change → task → dev → test → integration
```

---

## 我要重构模块 / 加一个大功能

```bash
taiyi new "重构支付模块为策略模式" --profile=full
# → full profile，9 个阶段，关键阶段有人工审批
```

---

## 我要搭一个 API 服务

```bash
taiyi new "搭建用户管理 API" --profile=api
# → api profile，8 个阶段（跳过 ui-design）
```

---

## 我要评审别人的代码

```bash
taiyi review-loop <slug>
# 不需要 new，直接用 review 循环
```

---

## 我要把需求拆成多个变更

```bash
taiyi plan README.md
# → 自动拆模块 + 推荐 profile，确认后批量 taiyi new
```

---

## 速查表

| 你的场景 | profile | 阶段数 | 需要写文档？ |
|---|---|---|---|
| 改一行代码 | `nano`（默认） | 2 | 否 |
| 加小功能 | `lite` | 5 | 少量 |
| 大功能/重构 | `full` | 9 | 全部 |
| 搭 API | `api` | 8 | 跳过 UI |
| 做 UI | `ui` | 9 | 全部 |

---

## 回到详细文档

- [完整九阶段流程](taiyi/nine-phase-flow.md)
- [全部命令](taiyi/canonical-commands.md)
- [5 分钟上手](../QUICKSTART.md)
