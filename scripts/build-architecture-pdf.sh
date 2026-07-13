#!/usr/bin/env bash
# 构建 ARCHITECTURE.md 的完整 PDF（含 14 张 Mermaid 图）
# 用法：bash scripts/build-architecture-pdf.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 字体
MAIN_FONT="${MAIN_FONT:-Heiti SC}"
MONO_FONT="${MONO_FONT:-STSong}"

# 中间产物
MD_SRC="$ROOT/ARCHITECTURE.md"
IMG_DIR="$ROOT/images"
GEN_MD="$ROOT/ARCHITECTURE-with-images.md"

# 1. 渲染 14 张 Mermaid → PNG
echo "1️⃣  渲染 Mermaid → PNG (14 张)..."
rm -rf "$IMG_DIR"
mkdir -p "$IMG_DIR"
node "$ROOT/scripts/render-mermaid.mjs" "$MD_SRC" \
  --format png \
  --out "$IMG_DIR" \
  --width 1200 --height 900 --scale 1 \
  | tail -3

# 2. 缩小超限图（> 3000 宽 或 > 4000 高，避免 xelatex Dimension too large）
echo "2️⃣  缩小超限图..."
for f in "$IMG_DIR"/*.png; do
  w=$(magick identify -format "%w" "$f" 2>/dev/null || echo "0")
  h=$(magick identify -format "%h" "$f" 2>/dev/null || echo "0")
  bn=$(basename "$f")
  pid_marker="$$"
  if [ "$w" -gt 3000 ]; then
    magick "$f" -resize 3000x "/tmp/sm-$pid_marker-$bn" && mv "/tmp/sm-$pid_marker-$bn" "$f"
    echo "  缩 $bn: ${w} → 3000"
  fi
  if [ "$h" -gt 4000 ]; then
    magick "$f" -resize x5000 "/tmp/sm-$pid_marker-$bn" && mv "/tmp/sm-$pid_marker-$bn" "$f"
    echo "  缩 $bn 高: ${h} → 5000"
  fi
done

# 3. 把 mermaid 块替换为图片引用
echo "3️⃣  替换 mermaid 块为图片引用..."
python3 - "$MD_SRC" "$GEN_MD" "$IMG_DIR" <<'PYEOF'
import re, sys
from pathlib import Path

src_path, out_path, img_dir = sys.argv[1], sys.argv[2], sys.argv[3]
src = Path(src_path).read_text()
pattern = re.compile(r"```mermaid\n(.*?)\n```", re.DOTALL)
counter = [0]
def repl(m):
    counter[0] += 1
    n = counter[0]
    return f'<div align="center">\n\n![Mermaid 图 {n}]({img_dir}/ARCHITECTURE-{n}.png){{width=80%}}\n\n</div>'
Path(out_path).write_text(pattern.sub(repl, src))
print(f"  替换 {counter[0]} 个 mermaid 块")
PYEOF

# 4. Pandoc → PDF
echo "4️⃣  Pandoc → PDF..."
pandoc "$GEN_MD" \
  -o "$ROOT/ARCHITECTURE.pdf" \
  --pdf-engine=xelatex \
  -V mainfont="$MAIN_FONT" \
  -V monofont="$MONO_FONT" \
  -V geometry:margin=1.5cm \
  --toc --toc-depth=2 \
  -V colorlinks=true 2>&1 | tail -3

# 5. 也生成 .tex 源（备份）
pandoc "$GEN_MD" \
  -o "$ROOT/ARCHITECTURE.tex" \
  --pdf-engine=xelatex \
  -V mainfont="$MAIN_FONT" \
  -V monofont="$MONO_FONT" \
  --toc --toc-depth=2 \
  -V colorlinks=true 2>&1 | tail -2

# 6. 验证
echo ""
echo "5️⃣  验证..."
pdfinfo "$ROOT/ARCHITECTURE.pdf" 2>/dev/null | grep -E "Pages|File size"
echo "嵌入图片: $(pdfimages -list "$ROOT/ARCHITECTURE.pdf" 2>/dev/null | tail -n +3 | wc -l)"

echo ""
echo "✅ 完成"
echo "  PDF: $ROOT/ARCHITECTURE.pdf"
echo "  TeX: $ROOT/ARCHITECTURE.tex"
echo "  中间产物（gitignored）: $GEN_MD + $IMG_DIR"