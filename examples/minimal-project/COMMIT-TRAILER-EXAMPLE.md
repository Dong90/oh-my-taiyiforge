# minimal-project · commit trailer 示例

`npm run walkthrough-e2e` 走 **纯 TaiyiForge** 九阶段。在 **integration 之前**，若工作区是 git 仓库，交付门会检查 commit message 是否含 `Taiyi-Change: <slug>`。

## 何时写 trailer

dev / test 阶段改完 `src/` 并 `npm test` 通过后，在 `complete integration` **之前** commit：

```bash
git add src test
git commit -m "$(cat <<'EOF'
feat: minimal counter demo

Taiyi-Change: minimal-demo
Taiyi-Phase: dev
EOF
)"
```

## 预览建议 message

```bash
scripts/taiyi-forge.sh commit-trailers minimal-demo "feat: minimal counter demo"
```

## 关闭检查（仅本地演示）

```bash
TAIYI_COMMIT_TRAILERS=0 scripts/taiyi-forge.sh complete minimal-demo integration --approver "你"
```

## 详见

- [docs/taiyi/delivery-gate.md](../../docs/taiyi/delivery-gate.md)
- [docs/taiyi/omc-reference.md](../../docs/taiyi/omc-reference.md)（设计参考说明，非 OMC 集成）
