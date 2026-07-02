#!/bin/bash
# TaiyiForge × Superpowers × ECC × GStack 最优融合方案 - 一键安装脚本
# 用法：bash scripts/install-optimal-fusion.sh

set -e

echo "🚀 安装 TaiyiForge × Superpowers × ECC × GStack 最优融合方案"
echo ""

# 1. 安装核心
echo "1️⃣  安装 TaiyiForge 核心..."
npm install --save-dev oh-my-taiyiforge

# 2. 安装 Superpowers（必选 · 纪律层）
echo ""
echo "2️⃣  安装 Superpowers（必选 · 纪律层 🔒）..."
npx taiyi-forge-install --all || echo "  ⚠️  taiyi-forge-install 需要交互模式，请手动跑"

# 3. 安装 ECC（深度能力层）
echo ""
echo "3️⃣  安装 ECC（深度能力层 📚）..."
if command -v ecc >/dev/null 2>&1; then
  echo "  ✓ ecc CLI 已存在"
else
  npm install --save-dev ecc-universal 2>/dev/null && {
    npx ecc install --profile full --target claude 2>/dev/null || echo "  ℹ️  ECC npm 安装完成，但请手动运行 'npx ecc install'"
  } || {
    # 备选：手动 clone
    if [ ! -d "$HOME/.ecc" ]; then
      git clone https://github.com/affaan-m/ECC.git "$HOME/.ecc" 2>/dev/null || echo "  ⚠️  请手动安装 ECC（见 https://github.com/affaan-m/ECC）"
    fi
  }
fi

# 4. 安装 GStack（快速工具层）
echo ""
echo "4️⃣  安装 GStack（快速工具层 ⚡）..."
if command -v bun >/dev/null 2>&1; then
  if [ ! -d "$HOME/gstack" ]; then
    git clone https://github.com/garrytan/gstack ~/gstack 2>/dev/null && {
      echo "  ✓ GStack 已 clone 到 ~/gstack"
    } || echo "  ⚠️  GStack clone 失败，请手动跑 git clone https://github.com/garrytan/gstack ~/gstack"
  else
    echo "  ✓ GStack 已存在 ~/gstack"
  fi
else
  echo "  ℹ️  跳过 GStack（需要 bun，可后续手动安装）"
  echo "      安装 bun: curl -fsSL https://bun.sh/install | bash"
fi

# 5. 安装开源依赖
echo ""
echo "5️⃣  安装开源依赖（playwright / semgrep / trivy / changesets）..."
npm install -D @playwright/test semgrep trivy changesets 2>/dev/null || {
  echo "  ⚠️  npm 依赖安装部分失败，可手动跑：npm install -D @playwright/test semgrep trivy changesets"
}

# 6. 启用激进版 manifest（可选）
echo ""
echo "6️⃣  manifest 选择..."
echo "  默认 manifest: workflow-manifest.yaml（数据驱动，ECC 可选）"
echo "  激进 manifest: workflow-manifest-optimized.yaml（ECC 强约束）"
echo ""
read -p "  是否启用激进版 manifest？(y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  export TAIYI_WORKFLOW_MANIFEST=optimized
  echo "  ✓ 已设置 TAIYI_WORKFLOW_MANIFEST=optimized"
  echo "  💡 后续命令前请加：export TAIYI_WORKFLOW_MANIFEST=optimized"
else
  echo "  ✓ 保持默认 manifest（数据驱动版）"
fi

# 7. 验证
echo ""
echo "7️⃣  验证安装..."
npx taiyi doctor || echo "  ⚠️  taiyi doctor 失败，请检查安装"

echo ""
echo "✅ 安装完成！"
echo ""
echo "📚 下一步："
echo "  - 阅读方案文档：cat docs/taiyi/integration-superpowers-ecc-gstack.md"
echo "  - 查看 manifest：cat docs/taiyi/workflow-manifest-optimized.yaml"
echo "  - 切换 manifest：TAIYI_WORKFLOW_MANIFEST=optimized taiyi status foo"
echo "  - 开始第一个变更：/taiyi:new '我的第一个功能'"
echo ""