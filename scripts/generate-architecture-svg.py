#!/usr/bin/env python3
"""Generate TaiyiForge architecture diagram SVG (Flow-X style)."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "docs" / "taiyiforge-architecture.svg"
PNG = OUT.with_suffix(".png")
SCALE = 1.35  # layout scale for sharper text/lines at export
W, H = int(1500 * SCALE), int(2020 * SCALE)
FONT_CANDIDATES = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]

PILLARS = [
    ("#0ea5e9", "#0369a1", "Harness Engineering", "流水线治理", "不达标不进、无产出不出"),
    ("#8b5cf6", "#5b21b6", "OpenSpec", "规格驱动开发", "先文档后实现 · 可选镜像/归档"),
    ("#14b8a6", "#0f766e", "GStack", "架构决策系统", "Options + Reason + Cost"),
    ("#f59e0b", "#b45309", "Superpowers", "AI 能力封装", "有界 Skill · 可验证输出"),
    ("#ec4899", "#be185d", "OMO", "人机协同节奏", "AI 执行 · 关键节点人审批"),
    ("#6366f1", "#4338ca", "Spec-Kit", "规范执行工具集", "templates + quality-gate 五维"),
]

ARTIFACTS = [
    ("CHANGE.md", "变更提案"),
    ("REQUIREMENT.md", "用户故事 + AC"),
    ("DESIGN.md", "技术设计 / ADR"),
    ("UI-DESIGN.md", "前端专项"),
    ("TASK.md", "任务拆解"),
    ("TEST.md", "测试报告"),
    ("REVIEW.md", "审查报告"),
    ("CHANGELOG.md", "集成交付"),
    ("CONTEXT.md", "上下文与术语"),
    ("architecture-sync.md", "架构同步"),
    ("adr/ · health-report.md", "决策与健康"),
]

STAGES = [
    ("1", "变更提案", "taiyi-change", "CHANGE.md", "#38bdf8"),
    ("2", "需求分析", "taiyi-requirement", "REQUIREMENT.md", "#60a5fa"),
    ("3", "技术设计", "taiyi-design", "DESIGN.md", "#818cf8"),
    ("4", "UI 设计", "taiyi-ui-design", "UI-DESIGN.md", "#a78bfa"),
    ("5", "任务拆解", "taiyi-task", "TASK.md", "#c084fc"),
    ("6", "开发执行", "taiyi-dev", "代码 + TDD", "#34d399"),
    ("7", "测试执行", "taiyi-test", "TEST.md", "#2dd4bf"),
    ("8", "代码审查", "taiyi-review", "REVIEW.md", "#fbbf24"),
    ("9", "集成交付", "taiyi-integration", "CHANGELOG.md", "#fb923c"),
]

MAIN_SKILLS = [s[2] for s in STAGES]
AUX_SKILLS = [
    ("taiyi-intel-scan", "入口扫描"),
    ("taiyi-architect", "架构维护"),
    ("taiyi-health", "健康基线"),
    ("taiyi-evolve", "架构演进"),
    ("taiyi-restyle", "UI 换肤"),
    ("taiyi-compress", "Token 压缩"),
]
ORCH_SKILLS = [
    ("taiyi-orchestrator", "全自动编排"),
    ("taiyi-forge", "控制面引擎"),
]

VALUES = [
    ("标准化", "减少不确定性"),
    ("可追溯", "文档驱动逐层审计"),
    ("可控执行", "AI 执行 · 人把关"),
    ("高质量交付", "门禁持续改进"),
    ("知识沉淀", "经验归档与演进"),
]


def robot_icon(x, y, color, label, sub=""):
    return f"""
  <g transform="translate({x},{y})">
    <rect x="0" y="0" width="88" height="100" rx="8" fill="#1e293b" stroke="{color}" stroke-width="1.5" opacity="0.95"/>
    <rect x="22" y="10" width="44" height="36" rx="6" fill="{color}" opacity="0.25"/>
    <circle cx="34" cy="26" r="4" fill="{color}"/>
    <circle cx="54" cy="26" r="4" fill="{color}"/>
    <rect x="30" y="36" width="28" height="4" rx="2" fill="{color}" opacity="0.6"/>
    <line x1="44" y1="4" x2="44" y2="10" stroke="{color}" stroke-width="2"/>
    <circle cx="44" cy="3" r="2" fill="{color}"/>
    <text x="44" y="62" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="600">{label}</text>
    <text x="44" y="78" text-anchor="middle" fill="#94a3b8" font-size="9">{sub}</text>
  </g>"""


def stage_card(x, y, num, title, skill, output, color):
    return f"""
  <g transform="translate({x},{y})">
    <rect x="0" y="0" width="138" height="108" rx="8" fill="#1e293b" stroke="{color}" stroke-width="1.5" filter="url(#cardGlow)"/>
    <rect x="0" y="0" width="138" height="28" rx="8" fill="{color}" opacity="0.2"/>
    <text x="12" y="20" fill="{color}" font-size="13" font-weight="700">{num}. {title}</text>
    <text x="12" y="48" fill="#cbd5e1" font-size="11">{skill}</text>
    <text x="12" y="68" fill="#94a3b8" font-size="10">产出 → {output}</text>
    <polygon points="124,54 134,54 129,62" fill="{color}" opacity="0.8"/>
  </g>"""


def pillar_card(x, c1, c2, title, sub, desc):
    return f"""
  <g transform="translate({x},108)">
    <rect x="0" y="0" width="228" height="108" rx="10" fill="url(#p_{x})" stroke="{c1}" stroke-width="1.2" filter="url(#cardGlow)"/>
    <text x="14" y="28" fill="#f8fafc" font-size="14" font-weight="700">{title}</text>
    <text x="14" y="48" fill="{c1}" font-size="12">{sub}</text>
    <text x="14" y="70" fill="#cbd5e1" font-size="11">{desc}</text>
  </g>
  <linearGradient id="p_{x}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="{c1}" stop-opacity="0.35"/>
    <stop offset="100%" stop-color="{c2}" stop-opacity="0.15"/>
  </linearGradient>"""


parts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="PingFang SC, Microsoft YaHei, system-ui, sans-serif">',
    """  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#060b18"/>
      <stop offset="50%" stop-color="#0c1228"/>
      <stop offset="100%" stop-color="#0a1020"/>
    </linearGradient>
    <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="#6366f1" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
    <filter id="cardGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#38bdf8" flood-opacity="0.18"/>
    </filter>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#38bdf8" opacity="0.7"/>
    </marker>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="0.5" opacity="0.4"/>
    </pattern>
  </defs>""",
    f'  <rect width="{W}" height="{H}" fill="url(#bgGrad)"/>',
    f'  <rect width="{W}" height="{H}" fill="url(#grid)" opacity="0.35"/>',
    f'  <g transform="scale({SCALE})">',
    # Title
    '  <text x="750" y="58" text-anchor="middle" fill="#f8fafc" font-size="38" font-weight="800">TaiyiForge</text>',
    '  <text x="750" y="92" text-anchor="middle" fill="#94a3b8" font-size="18">把六大工程规范变成 AI 可执行工作流 · v0.22</text>',
]

# Pillars
for i, (c1, c2, title, sub, desc) in enumerate(PILLARS):
    parts.append(pillar_card(40 + i * 238, c1, c2, title, sub, desc))

# Left ARTIFACT column
parts.append("""
  <g transform="translate(40,250)">
    <rect x="0" y="0" width="240" height="520" rx="12" fill="#0f1d3a" stroke="#3b82f6" stroke-width="1.5" filter="url(#cardGlow)"/>
    <text x="16" y="34" fill="#60a5fa" font-size="16" font-weight="700">ARTIFACT 文档体系</text>
    <text x="16" y="56" fill="#94a3b8" font-size="11">.taiyi/changes/&lt;slug&gt;/ 真源</text>
    <text x="16" y="74" fill="#64748b" font-size="10">下一阶段必须基于上一阶段文档</text>
""")

y = 88
for name, desc in ARTIFACTS:
    parts.append(f'    <rect x="12" y="{y}" width="216" height="34" rx="6" fill="#172554" stroke="#334155"/>')
    parts.append(f'    <text x="22" y="{y+16}" fill="#38bdf8" font-size="12" font-weight="600">{name}</text>')
    parts.append(f'    <text x="22" y="{y+30}" fill="#94a3b8" font-size="10">{desc}</text>')
    y += 38

parts.append("  </g>")

# Right GATE column
parts.append("""
  <g transform="translate(1220,250)">
    <rect x="0" y="0" width="240" height="520" rx="12" fill="#2a0f1a" stroke="#f43f5e" stroke-width="1.5" filter="url(#cardGlow)"/>
    <text x="16" y="34" fill="#fb7185" font-size="16" font-weight="700">三重门禁机制</text>
    <text x="16" y="56" fill="#94a3b8" font-size="11">每阶段过关前必须通过</text>

    <rect x="12" y="72" width="216" height="118" rx="8" fill="#3f0d1a" stroke="#fb7185" stroke-width="1"/>
    <text x="22" y="98" fill="#fecdd3" font-size="12" font-weight="700">HUMAN APPROVAL GATE</text>
    <text x="22" y="118" fill="#fda4af" font-size="11">人工审批门</text>
    <text x="22" y="136" fill="#fecdd3" font-size="10">默认: change / design / review</text>
    <text x="22" y="154" fill="#fecdd3" font-size="10">--approver 可记录审批人</text>
    <text x="22" y="176" fill="#94a3b8" font-size="10">OMO: AI 执行 · 人把关</text>

    <rect x="12" y="204" width="216" height="130" rx="8" fill="#1a2e1a" stroke="#4ade80" stroke-width="1"/>
    <text x="22" y="230" fill="#86efac" font-size="12" font-weight="700">QUALITY GATE</text>
    <text x="22" y="250" fill="#bbf7d0" font-size="11">质量五维检查</text>
    <text x="22" y="268" fill="#dcfce7" font-size="10">完整性 · 一致性 · 可验证性</text>
    <text x="22" y="284" fill="#dcfce7" font-size="10">可追溯性 · 工程质量</text>
    <text x="22" y="306" fill="#94a3b8" font-size="10">Spec-Kit templates + quality-gate</text>

    <rect x="12" y="348" width="216" height="118" rx="8" fill="#1a1a3a" stroke="#818cf8" stroke-width="1"/>
    <text x="22" y="374" fill="#a5b4fc" font-size="12" font-weight="700">DELIVERY GATE (0.22)</text>
    <text x="22" y="394" fill="#c7d2fe" font-size="11">交付门 · integration 前</text>
    <text x="22" y="412" fill="#e0e7ff" font-size="10">git 有新 commit · 工作区干净</text>
    <text x="22" y="428" fill="#e0e7ff" font-size="10">workflow-audit 自动审计</text>
    <text x="22" y="450" fill="#94a3b8" font-size="10">audit · verify · health 排查</text>

    <text x="16" y="492" fill="#64748b" font-size="10">archive 前 auto sync-openspec</text>
  </g>
""")

# Center hub
parts.append("""
  <circle cx="750" cy="480" r="160" fill="url(#hubGlow)" opacity="0.75"/>
  <circle cx="750" cy="480" r="118" fill="#0f172a" stroke="#38bdf8" stroke-width="3" filter="url(#cardGlow)"/>
  <circle cx="750" cy="480" r="100" fill="none" stroke="#6366f1" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
  <text x="750" y="452" text-anchor="middle" fill="#38bdf8" font-size="15" font-weight="800">TAIYIFORGE</text>
  <text x="750" y="474" text-anchor="middle" fill="#a5b4fc" font-size="13" font-weight="600">CORE ENGINE</text>
  <text x="750" y="494" text-anchor="middle" fill="#94a3b8" font-size="11">AI 工作流引擎</text>
  <text x="750" y="516" text-anchor="middle" fill="#cbd5e1" font-size="10">统一入口 · 意图分析 · 路由决策</text>
  <text x="750" y="534" text-anchor="middle" fill="#cbd5e1" font-size="10">复杂度评估 · 状态追踪 · Harness 编排</text>
  <text x="750" y="556" text-anchor="middle" fill="#4ade80" font-size="10">0.22: audit / verify / health / 根 CHANGELOG</text>
""")

# Connection lines
parts.append("""
  <path d="M 280 400 Q 500 400 620 460" fill="none" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arrow)" opacity="0.6"/>
  <path d="M 1220 400 Q 1000 400 880 460" fill="none" stroke="#f43f5e" stroke-width="1.5" marker-end="url(#arrow)" opacity="0.6"/>
  <path d="M 750 600 L 750 680" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" opacity="0.7"/>
""")

# Nine stages label
parts.append("""
  <text x="750" y="700" text-anchor="middle" fill="#38bdf8" font-size="20" font-weight="700">九阶段主流程</text>
  <text x="750" y="724" text-anchor="middle" fill="#64748b" font-size="12">profile: full 9 · api 8（跳过 ui-design）· lite 5 · continue 每轮推进一阶段</text>
""")

# Stage cards - 3 rows x 3
sx, sy = 310, 740
for i, stage in enumerate(STAGES):
    row, col = divmod(i, 3)
    parts.append(stage_card(sx + col * 300, sy + row * 128, *stage))

# Stage flow arrows between cards in row
for row in range(3):
    for col in range(2):
        x1 = sx + col * 300 + 138
        x2 = sx + (col + 1) * 300
        y = sy + row * 128 + 54
        parts.append(f'  <line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="#475569" stroke-width="1" marker-end="url(#arrow)" opacity="0.5"/>')

# Iron triangle band
parts.append("""
  <g transform="translate(40,1160)">
    <rect x="0" y="0" width="1420" height="88" rx="10" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.2"/>
    <text x="20" y="30" fill="#a5b4fc" font-size="15" font-weight="700">铁三角（分阶段 optional 打卡 · --auto 下不阻塞 complete）</text>
    <text x="20" y="52" fill="#c7d2fe" font-size="12">Superpowers: brainstorming · TDD · verification · subagent</text>
    <text x="20" y="70" fill="#c7d2fe" font-size="12">GStack: plan-eng-review · plan-design-review(可选) · qa(可选) · review · document-release</text>
    <text x="720" y="52" fill="#c7d2fe" font-size="12">OpenSpec: change show(可选) · sync-openspec · archive 前自动 sync</text>
    <text x="720" y="70" fill="#94a3b8" font-size="11">四端: OpenCode · Claude · Codex · Cursor</text>
  </g>
""")

# Skills section
parts.append("""
  <text x="750" y="1290" text-anchor="middle" fill="#4ade80" font-size="22" font-weight="700">17 Skills 全景</text>
  <text x="750" y="1316" text-anchor="middle" fill="#64748b" font-size="12">9 主流程 Skill 驱动单次交付 · 6 辅助 + 编排 + 控制面按需触发</text>
  <text x="120" y="1344" fill="#86efac" font-size="13" font-weight="600">主流程 (9)</text>
""")

colors_main = ["#38bdf8"] * 9
for i, skill in enumerate(MAIN_SKILLS):
    parts.append(robot_icon(120 + i * 148, 1350, colors_main[i], skill.replace("taiyi-", ""), "主流程"))

parts.append('  <text x="120" y="1484" fill="#fbbf24" font-size="13" font-weight="600">辅助 (6) + 编排 + 控制面</text>')

aux_colors = ["#2dd4bf", "#34d399", "#f472b6", "#a78bfa", "#fb923c", "#94a3b8", "#fcd34d", "#6366f1"]
all_aux = AUX_SKILLS + ORCH_SKILLS
for i, (skill, sub) in enumerate(all_aux):
    parts.append(robot_icon(120 + i * 148, 1495, aux_colors[i % len(aux_colors)], skill.replace("taiyi-", ""), sub))

# Chat commands strip
parts.append("""
  <g transform="translate(40,1640)">
    <rect x="0" y="0" width="1420" height="72" rx="10" fill="#422006" stroke="#f59e0b" stroke-width="1.2"/>
    <text x="20" y="28" fill="#fcd34d" font-size="14" font-weight="700">聊天 / CLI 命令</text>
    <text x="20" y="52" fill="#fde68a" font-size="12">/taiyi:new · status · continue · apply · archive</text>
    <text x="520" y="52" fill="#fef3c7" font-size="12">doctor · audit · verify · health · review-loop</text>
    <text x="980" y="52" fill="#94a3b8" font-size="11">scripts/taiyi-forge.sh · taiyi CLI · 145 tests</text>
  </g>
""")

# Footer values
parts.append("""
  <text x="750" y="1760" text-anchor="middle" fill="#38bdf8" font-size="18" font-weight="700">核心价值</text>
""")

for i, (title, desc) in enumerate(VALUES):
    vx = 120 + i * 270
    parts.append(f"""
  <g transform="translate({vx},1780)">
    <circle cx="40" cy="40" r="36" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" filter="url(#cardGlow)"/>
    <circle cx="40" cy="40" r="28" fill="#38bdf8" opacity="0.15"/>
    <text x="40" y="36" text-anchor="middle" fill="#38bdf8" font-size="18">{"★☆◎◆●"[i]}</text>
    <text x="40" y="94" text-anchor="middle" fill="#f8fafc" font-size="13" font-weight="600">{title}</text>
    <text x="40" y="112" text-anchor="middle" fill="#94a3b8" font-size="10">{desc}</text>
  </g>""")

# Bottom tagline
parts.append("""
  <rect x="40" y="1920" width="1420" height="48" rx="8" fill="#0f172a" stroke="#334155"/>
  <text x="750" y="1950" text-anchor="middle" fill="#64748b" font-size="12">左: 文档真源 · 中: 引擎调度九阶段 · 右: 三重门禁 · 底: 17 Skill + 铁三角 + 排查命令 · 开源 MIT</text>
  <text x="750" y="1998" text-anchor="middle" fill="#475569" font-size="11">docs/taiyiforge-architecture.svg · TaiyiForge v0.22</text>
""")

parts.append("  </g>")
parts.append("</svg>")

svg = "\n".join(parts)
OUT.write_text(svg, encoding="utf-8")
print(f"Wrote {OUT} ({len(svg)} bytes, {W}x{H})")


def export_png() -> None:
    font = next((p for p in FONT_CANDIDATES if Path(p).exists()), None)
    cmd = [
        "npx",
        "--yes",
        "@resvg/resvg-js-cli",
        "--fit-zoom",
        "2",
        "--text-rendering",
        "1",
        "--shape-rendering",
        "2",
        "--dpi",
        "192",
        str(OUT),
        str(PNG),
    ]
    if font:
        cmd.extend(["--font-file", font, "--font-sans-serif-family", "PingFang SC"])
    print("Export:", " ".join(cmd))
    subprocess.run(cmd, check=True)
    info = PNG.stat()
    print(f"Wrote {PNG} ({info.st_size // 1024} KB)")


if __name__ == "__main__":
    try:
        export_png()
    except subprocess.CalledProcessError as exc:
        print(f"PNG export failed: {exc}", file=sys.stderr)
        sys.exit(exc.returncode)
