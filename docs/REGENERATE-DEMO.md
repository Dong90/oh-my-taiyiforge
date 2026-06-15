# 重新生成 `demo.gif`

> **源文件**：[`docs/diagrams/demo.cast`](diagrams/demo.cast)（6 KB asciicast v3 格式）
> **生成产物**：[`docs/diagrams/demo.gif`](diagrams/demo.gif)（324 KB / 860×608 / 27 秒）
> **录制命令**：在 macOS / Linux 本机执行（需真 PTY，CI / Docker 里录不出来）

## 工具安装

```bash
brew install asciinema agg
```

## 录制源 .cast

把 demo 脚本写到 `/tmp/demo.sh`：

```bash
cat > /tmp/demo.sh << 'EOF'
#!/usr/bin/env bash
cd /path/to/oh-my-taiyiforge
export TERM=xterm-256color COLUMNS=100 LINES=30
clear
printf "\033[1;36m═══════════════════════════════════════════════════════════════════\033[0m\n"
printf "\033[1;36m  TaiyiForge  ·  Real terminal demo\033[0m\n"
printf "\033[1;36m═══════════════════════════════════════════════════════════════════\033[0m\n"
sleep 1
echo
echo "# Step 1: walkthrough"
npx taiyi walkthrough 2>&1 | head -25
sleep 1
echo
echo "# Step 2: new"
npx taiyi new "Add dark mode toggle" 2>&1 | head -15
sleep 1
echo
echo "# Step 3: status"
npx taiyi status 2>&1 | head -15
sleep 1
echo
echo "# Step 4: list"
npx taiyi list 2>&1
sleep 1
echo
echo "# Step 5: view CHANGE.md"
head -20 .taiyi/changes/*/CHANGE.md
echo
echo "✓ Demo complete"
EOF
chmod +x /tmp/demo.sh

# 录制（须先 cd 到有 dist/ 的仓库根）
asciinema rec docs/diagrams/demo.cast \
  --command "/tmp/demo.sh" \
  --cols 100 --rows 30 \
  --idle-time-limit 3 \
  --title "TaiyiForge — Real terminal demo"
```

## 转 GIF

```bash
agg docs/diagrams/demo.cast docs/diagrams/demo.gif \
  --theme dracula \
  --cols 100 --rows 30 \
  --font-size 14 \
  --line-height 1.4 \
  --speed 1.0 \
  --idle-time-limit 3 \
  --last-frame-duration 3
```

## 主题选择

| agg theme | 风格 | 适合 |
|-----------|------|------|
| `dracula` | 深紫 / 暗 | README 顶栏演示（**当前选用**） |
| `github-dark` | GitHub 深色 | 与仓库 UI 一致 |
| `monokai` | 经典 | 编程社区熟悉感 |
| `solarized-dark` | 暗藏蓝 | 长文阅读 |
| `nord` | 冷淡蓝灰 | 北欧极简 |

## 为什么用 `.cast` 入库而不是只放 `.gif`？

1. **可访问性**：.cast 在 asciinema 播放器里可暂停 / 复制 / 选中文本
2. **可重用**：任何时候想换主题或调整尺寸，从 .cast 重新跑 agg 即可
3. **Git diff 友好**：.cast 体积小（KB 级），GIF 是 MB 级且 diff 无意义
4. **可嵌入网页**：[asciinema-player](https://github.com/asciinema/asciinema-player) 可在 README / 文档站直接播 .cast，无需后端

## 失败排查

- **GIF 全黑 / 全白** — Chrome 渲染时缺字体；安装 `JetBrains Mono` 后重试
- **首帧正常但之后空白** — `agg` 用了 `swash` 渲染器（默认），改 `--renderer resvg`
- **录制只有几秒** — exec 在 pipe 而非 PTY；必须用真终端（iTerm / Terminal.app / gnome-terminal）
- **中文乱码** — `export LANG=en_US.UTF-8` 再录
