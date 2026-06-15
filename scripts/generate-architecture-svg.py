#!/usr/bin/env python3
"""
Generate TaiyiForge architecture diagram — layout aligned with Flow-X reference.
Regenerate: python3 scripts/generate-architecture-svg.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "docs" / "taiyiforge-architecture.svg"
PNG = OUT.with_suffix(".png")
ROOT = OUT.parent.parent
SKILL_COUNT = len(list((ROOT / "skills").glob("*/SKILL.md")))

# Native canvas (Flow-X proportions: wide poster)
W, H = 2800, 1880
PNG_ZOOM = 6  # 16800 × 11280 px export
PNG_DPI = 300
VERSION = "v0.22"

FONT = "PingFang SC, Microsoft YaHei, SF Pro Display, system-ui, sans-serif"
FONT_CANDIDATES = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]

# Flow-X–style palette
BG = "#060b16"
PANEL = "#0d1528"
PANEL2 = "#111d35"
LINE = "#243049"
TEXT = "#eef2ff"
SUB = "#94a3b8"
DIM = "#64748b"

PILLARS = [
    ("#0ea5e9", "Harness Engineering", "流水线治理 · 不达标不进"),
    ("#22c55e", "OpenSpec", "规格驱动 · 可选镜像"),
    ("#a855f7", "GStack", "Options + Reason + Cost"),
    ("#14b8a6", "Superpowers", "有界 Skill · 可验证 I/O"),
    ("#3b82f6", "OMO", "AI 执行 · 人审批"),
    ("#ec4899", "Spec-Kit", "templates · 质量五维"),
]

ARTIFACTS = [
    ("#38bdf8", "CHANGE.md"),
    ("#38bdf8", "REQUIREMENT.md"),
    ("#38bdf8", "DESIGN.md"),
    ("#38bdf8", "UI-DESIGN.md"),
    ("#38bdf8", "TASK.md"),
    ("#34d399", "代码 + 测试"),
    ("#34d399", "TEST.md"),
    ("#fbbf24", "REVIEW.md"),
    ("#fb923c", "CHANGELOG.md"),
    ("#22d3ee", "CONTEXT.md · adr/"),
]

PHASES = [
    ("1", "#38bdf8", "变更提案", "taiyi-change", "CHANGE.md"),
    ("2", "#60a5fa", "需求分析", "taiyi-requirement", "REQUIREMENT.md"),
    ("3", "#818cf8", "技术设计", "taiyi-design", "DESIGN.md"),
    ("4", "#a78bfa", "UI 设计", "taiyi-ui-design", "UI-DESIGN.md"),
    ("5", "#c084fc", "任务拆分", "taiyi-task", "TASK.md"),
    ("6", "#34d399", "开发执行", "taiyi-dev", "代码 + TDD"),
    ("7", "#2dd4bf", "测试执行", "taiyi-test", "TEST.md"),
    ("8", "#fbbf24", "代码审查", "taiyi-review", "REVIEW.md"),
    ("9", "#fb923c", "集成交付", "taiyi-integration", "CHANGELOG.md"),
]

MAIN_SKILLS = [
    ("#38bdf8", "taiyi-change"),
    ("#60a5fa", "taiyi-requirement"),
    ("#818cf8", "taiyi-design"),
    ("#a78bfa", "taiyi-ui-design"),
    ("#c084fc", "taiyi-task"),
    ("#34d399", "taiyi-dev"),
    ("#2dd4bf", "taiyi-test"),
    ("#fbbf24", "taiyi-review"),
    ("#fb923c", "taiyi-integration"),
]

AUX_SKILLS = [
    ("#22d3ee", "taiyi-intel-scan", "技术扫描"),
    ("#818cf8", "taiyi-architect", "架构维护"),
    ("#34d399", "taiyi-health", "健康检查"),
    ("#a78bfa", "taiyi-evolve", "架构演进"),
    ("#f472b6", "taiyi-restyle", "UI 改版"),
    ("#fcd34d", "taiyi-compress", "Token 压缩"),
    ("#38bdf8", "taiyi-diagram-arch", "架构图"),
    ("#2dd4bf", "taiyi-diagram-flow", "流程图"),
]

ORCH_SKILLS = [
    ("#38bdf8", "taiyi-forge", "引擎控制面"),
    ("#f472b6", "taiyi-orchestrator", "全自动编排"),
    ("#a78bfa", "taiyi-ultrawork", "高吞吐并行"),
]

VALUES = [
    ("标准化", "减少不确定性"),
    ("可追溯", "文档逐层审计"),
    ("可控执行", "AI 执行 · 人把关"),
    ("高质量交付", "三重门禁"),
    ("知识沉淀", "经验归档演进"),
]


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;")


def defs() -> str:
    return f"""  <defs>
    <linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1224"/>
      <stop offset="100%" stop-color="{BG}"/>
    </linearGradient>
    <radialGradient id="hubG" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.55"/>
      <stop offset="70%" stop-color="#1d4ed8" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="cardSh" x="-6%" y="-6%" width="112%" height="115%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000" flood-opacity="0.45"/>
    </filter>
    <marker id="arr" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 Z" fill="#64748b"/>
    </marker>
    <marker id="arrB" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 Z" fill="#38bdf8"/>
    </marker>
  </defs>"""


def T(x, y, s, size=14, fill=TEXT, weight=400, anchor="start") -> str:
    return (
        f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}" font-weight="{weight}" '
        f'text-anchor="{anchor}" font-family="{FONT}">{esc(s)}</text>'
    )


def box(x, y, w, h, fill=PANEL, stroke=LINE, rx=14, sw=1.5) -> str:
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def pillar_icon(x, y, color, kind: str) -> str:
    """Minimal line icons per pillar."""
    g = f'<g transform="translate({x},{y})" stroke="{color}" fill="none" stroke-width="2">'
    if kind == "harness":
        g += '<rect x="4" y="8" width="28" height="20" rx="3"/><path d="M10 8V4h16v4"/>'
    elif kind == "openspec":
        g += '<path d="M6 6h20v22H6z"/><path d="M10 12h12M10 17h8"/>'
    elif kind == "gstack":
        g += '<path d="M18 4L32 14 18 24 4 14z"/><circle cx="18" cy="14" r="3" fill="' + color + '"/>'
    elif kind == "super":
        g += '<path d="M18 6l3 9h9l-7 5 3 9-8-6-8 6 3-9-7-5h9z"/>'
    elif kind == "omo":
        g += '<circle cx="18" cy="12" r="7"/><path d="M8 28c2-6 7-9 10-9s8 3 10 9"/>'
    else:
        g += '<rect x="6" y="6" width="24" height="24" rx="4"/><path d="M12 14h12M12 19h8"/>'
    return g + "</g>"


def robot(x, y, color, size=36) -> str:
    s = size / 36
    return f"""<g transform="translate({x},{y}) scale({s})" filter="url(#cardSh)">
  <rect x="4" y="10" width="28" height="22" rx="6" fill="{PANEL2}" stroke="{color}" stroke-width="1.8"/>
  <circle cx="12" cy="20" r="3" fill="{color}"/>
  <circle cx="24" cy="20" r="3" fill="{color}"/>
  <rect x="14" y="26" width="8" height="3" rx="1" fill="{color}" opacity="0.7"/>
  <rect x="16" y="4" width="4" height="8" rx="2" fill="{color}"/>
</g>"""


def phase_icon(x, y, color, n: str) -> str:
    icons = {
        "1": '<path d="M8 20h16M12 12h8M12 28h8"/>',
        "2": '<path d="M6 10h20v4H6zM6 18h14v4H6zM6 26h18v4H6z"/>',
        "3": '<path d="M8 8h16v20H8zM12 14h8M12 20h8"/>',
        "4": '<rect x="6" y="10" width="20" height="14" rx="2"/><path d="M6 16h20"/>',
        "5": '<path d="M8 8v20M16 12v16M24 10v18"/>',
        "6": '<path d="M8 26l8-16 8 16"/>',
        "7": '<circle cx="16" cy="16" r="10"/><path d="M12 16l3 3 6-7"/>',
        "8": '<circle cx="16" cy="16" r="10"/><path d="M11 16h10M16 11v10"/>',
        "9": '<path d="M8 12h16v14H8zM12 8h8v4H12z"/>',
    }
    p = icons.get(n, icons["1"])
    return f"""<g transform="translate({x},{y})">
  <rect x="0" y="0" width="32" height="32" rx="8" fill="{color}" opacity="0.18"/>
  <g transform="translate(0,0)" stroke="{color}" fill="none" stroke-width="1.8" stroke-linecap="round">{p}</g>
</g>"""


def build() -> str:
    p: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
        defs(),
        f'<rect width="{W}" height="{H}" fill="url(#bgG)"/>',
        # ── Header (Flow-X style) ──
        T(W // 2, 72, "TaiyiForge", 52, TEXT, 800, "middle"),
        T(
            W // 2,
            118,
            "把六大工程规范变成 AI 可执行工作流",
            22,
            SUB,
            500,
            "middle",
        ),
        T(
            W // 2,
            152,
            f"6 大工程规范融合  ×  {SKILL_COUNT} Skill 协同执行  ×  四端统一  ×  OMC 原生控制面",
            16,
            DIM,
            400,
            "middle",
        ),
        T(W - 80, 56, VERSION, 16, "#38bdf8", 600, "end"),
        T(W - 80, 80, "oh-my-taiyiforge", 13, DIM, 400, "end"),
        f'<line x1="100" y1="175" x2="{W - 100}" y2="175" stroke="{LINE}" stroke-width="1"/>',
    ]

    # ── Six pillars ──
    pw, ph, px0, py = 420, 108, 100, 195
    kinds = ["harness", "openspec", "gstack", "super", "omo", "speckit"]
    for i, ((col, title, desc), kind) in enumerate(zip(PILLARS, kinds)):
        x = px0 + i * (pw + 16)
        p.append(box(x, py, pw, ph, PANEL2, col, 12, 1.8))
        p.append(pillar_icon(x + 18, py + 18, col, kind))
        p.append(T(x + 68, py + 38, title, 17, TEXT, 700))
        p.append(T(x + 68, py + 62, desc, 13, col))
        # connector to engine
        cx = x + pw // 2
        p.append(
            f'<path d="M {cx} {py + ph} C {cx} {py + ph + 40} {W // 2} {320} {W // 2} {360}" '
            f'stroke="{col}" stroke-width="1" opacity="0.35" fill="none"/>'
        )

    # ── Main triptych frame ──
    my, mh = 330, 680
    lx, lw = 100, 340
    rx, rw = W - 440, 340
    cx, cw = 460, W - 920
    p.append(box(lx, my, lw, mh, PANEL, "#3b82f6", 16, 2))
    p.append(box(cx, my, cw, mh, PANEL, "#334155", 16, 1.5))
    p.append(box(rx, my, rw, mh, PANEL, "#f43f5e", 16, 2))

    # Left — ARTIFACT
    p.append(T(lx + 24, my + 36, "ARTIFACT 文档体系", 18, "#60a5fa", 700))
    p.append(T(lx + 24, my + 62, ".taiyi/changes/<slug>/ 真源 · 分层依赖", 12, DIM))
    for i, (col, name) in enumerate(ARTIFACTS):
        ay = my + 88 + i * 58
        p.append(f'<rect x="{lx + 20}" y="{ay}" width="8" height="40" rx="3" fill="{col}"/>')
        p.append(box(lx + 36, ay, lw - 56, 40, PANEL2, LINE, 8, 1))
        p.append(T(lx + 52, ay + 26, name, 14, TEXT, 600))
    p.append(T(lx + 24, my + mh - 36, "文档驱动 · 逐层依赖 · 下一阶段基于上一阶段工件", 11, DIM))

    # Right — Gates (Flow-X 双重 + TaiyiForge 交付门)
    p.append(T(rx + 24, my + 36, "三重门禁机制", 18, "#fb7185", 700))
    p.append(T(rx + 24, my + 62, "complete 前须全部通过", 12, DIM))
    gates = [
        ("#fecdd3", "#fb7185", "#3f0d1a", "① Human Approval", "人工审批 · OMO 人把关", "change / design / review"),
        ("#bbf7d0", "#4ade80", "#1a2e1a", "② Quality Gate", "完整性 · 一致性 · 可验证性", "可追溯 · 工程质量"),
        ("#c7d2fe", "#818cf8", "#1a1a3a", "③ Delivery Gate", "integration 前 · git 干净", "audit · archive · openspec"),
    ]
    for i, (tc, bc, bg, title, l1, l2) in enumerate(gates):
        gy = my + 88 + i * 200
        p.append(box(rx + 20, gy, rw - 40, 168, bg, "#eab308", 12, 2))
        p.append(box(rx + 24, gy + 4, rw - 48, 160, bg, bc, 10, 1.2))
        p.append(T(rx + 40, gy + 36, title, 16, tc, 700))
        p.append(T(rx + 40, gy + 68, l1, 13, SUB))
        p.append(T(rx + 40, gy + 94, l2, 12, DIM))
        if i < 2:
            p.append(
                f'<line x1="{rx + rw // 2}" y1="{gy + 168}" x2="{rx + rw // 2}" y2="{gy + 188}" '
                f'stroke="{bc}" stroke-width="2" marker-end="url(#arr)"/>'
            )

    # Center — Engine hub (upper)
    hub_x, hub_y = cx + cw // 2, my + 200
    p.append(T(cx + cw // 2, my + 32, "TAIYIFORGE CORE ENGINE", 16, DIM, 600, "middle"))
    p.append(f'<circle cx="{hub_x}" cy="{hub_y}" r="120" fill="url(#hubG)"/>')
    p.append(
        f'<circle cx="{hub_x}" cy="{hub_y}" r="78" fill="{PANEL2}" stroke="#38bdf8" '
        f'stroke-width="3" filter="url(#glow)"/>'
    )
    p.append(T(hub_x, hub_y - 14, "AI 工作流引擎", 15, "#38bdf8", 700, "middle"))
    p.append(T(hub_x, hub_y + 10, "workflow-engine", 12, SUB, 400, "middle"))

    engine_labels = [
        (hub_x - 280, hub_y - 60, "统一入口", "taiyi CLI · forge.sh · /taiyi:*"),
        (hub_x - 280, hub_y + 20, "意图分析", "复杂度 · profile · token"),
        (hub_x - 280, hub_y + 100, "前置校验", "artifact · harness"),
        (hub_x + 180, hub_y - 60, "路由决策", "phase · skill · gate"),
        (hub_x + 180, hub_y + 20, "状态追踪", "state.json · runtime"),
        (hub_x + 180, hub_y + 100, "模式编排", "ralph · autopilot · step"),
    ]
    for lx2, ly2, title, desc in engine_labels:
        p.append(box(lx2, ly2, 200, 52, PANEL2, LINE, 8, 1))
        p.append(T(lx2 + 12, ly2 + 22, title, 13, "#38bdf8", 700))
        p.append(T(lx2 + 12, ly2 + 40, desc, 10, DIM))

    # Arrows hub ↔ sides
    p.append(
        f'<path d="M {lx + lw} {my + mh // 2} L {cx} {hub_y}" stroke="#3b82f6" stroke-width="2" '
        f'marker-end="url(#arrB)" opacity="0.7" fill="none"/>'
    )
    p.append(
        f'<path d="M {hub_x + 80} {hub_y} L {rx} {my + mh // 2}" stroke="#4ade80" stroke-width="2" '
        f'marker-end="url(#arrB)" opacity="0.7" fill="none"/>'
    )

    # Center — 9 phases (Flow-X single row)
    p.append(T(cx + 24, my + 340, "9 主流程阶段", 18, TEXT, 700))
    p.append(T(cx + 24, my + 366, "Skill 驱动 · continue 推进 · profile: full·9 / api·8 / lite·5", 12, DIM))

    sw, sg, sy = 168, 12, my + 400
    total_w = 9 * sw + 8 * sg
    px0 = cx + (cw - total_w) // 2
    for i, (n, col, title, skill, out) in enumerate(PHASES):
        px = px0 + i * (sw + sg)
        py = sy
        p.append(box(px, py, sw, 148, PANEL2, col, 12, 1.8))
        p.append(f'<circle cx="{px + 28}" cy="{py + 28}" r="18" fill="{col}" opacity="0.22"/>')
        p.append(T(px + 28, py + 34, n, 16, col, 800, "middle"))
        p.append(phase_icon(px + 52, py + 12, col, n))
        p.append(T(px + 14, py + 58, title, 15, TEXT, 700))
        p.append(T(px + 14, py + 82, skill, 12, col))
        p.append(T(px + 14, py + 104, f"→ {out}", 12, DIM))
        p.append(box(px + 14, py + 118, sw - 28, 20, col, col, 4, 0.8))
        p.append(T(px + sw // 2, py + 132, "Skill 驱动", 10, TEXT, 600, "middle"))
        if i < 8:
            p.append(
                f'<line x1="{px + sw}" y1="{py + 74}" x2="{px + sw + sg}" y2="{py + 74}" '
                f'stroke="{LINE}" stroke-width="2" marker-end="url(#arr)"/>'
            )

    # ── Skill panorama ──
    sy2 = 1040
    p.append(box(100, sy2, W - 200, 520, PANEL, "#6366f1", 16, 1.8))
    p.append(T(W // 2, sy2 + 40, "20 个 Skill 全景图", 22, TEXT, 700, "middle"))
    p.append(T(W // 2, sy2 + 68, "主流程 ×9  ·  辅助 ×8  ·  编排 ×3（taiyi-forge / orchestrator / ultrawork）", 14, DIM, 400, "middle"))

    p.append(T(140, sy2 + 110, "主流程 Skill（9）", 15, "#60a5fa", 700))
    for i, (col, name) in enumerate(MAIN_SKILLS):
        sx = 140 + i * 288
        p.append(robot(sx, sy2 + 130, col, 40))
        p.append(T(sx + 8, sy2 + 188, name, 13, col, 600))

    p.append(T(140, sy2 + 230, "辅助 Skill（8）", 15, "#22d3ee", 700))
    for i, (col, name, label) in enumerate(AUX_SKILLS):
        sx = 140 + i * 320
        p.append(robot(sx, sy2 + 250, col, 36))
        p.append(T(sx + 4, sy2 + 302, name, 12, col, 600))
        p.append(T(sx + 4, sy2 + 320, label, 11, DIM))

    p.append(T(140, sy2 + 360, "编排 Skill（3）", 15, "#f472b6", 700))
    for i, (col, name, label) in enumerate(ORCH_SKILLS):
        sx = 140 + i * 880
        p.append(robot(sx, sy2 + 380, col, 40))
        p.append(T(sx + 8, sy2 + 438, name, 13, col, 600))
        p.append(T(sx + 8, sy2 + 458, label, 11, DIM))

    # Four platforms strip
    p.append(T(140, sy2 + 490, "四端", 13, SUB, 700))
    for i, (name, col) in enumerate(
        [("OpenCode", "#3b82f6"), ("Claude", "#f59e0b"), ("Codex", "#22c55e"), ("Cursor", "#06b6d4")]
    ):
        px = 200 + i * 620
        p.append(box(px, sy2 + 472, 580, 36, PANEL2, col, 8, 1.2))
        p.append(T(px + 290, sy2 + 496, name, 14, col, 600, "middle"))

    # ── Core values footer ──
    vy = 1600
    p.append(f'<line x1="100" y1="{vy - 20}" x2="{W - 100}" y2="{vy - 20}" stroke="{LINE}"/>')
    p.append(T(W // 2, vy + 10, "核心价值", 18, DIM, 600, "middle"))
    vw = 500
    for i, (title, desc) in enumerate(VALUES):
        vx = 100 + i * (vw + 25)
        p.append(box(vx, vy + 30, vw, 100, PANEL2, "#38bdf8", 12, 1.2))
        p.append(f'<circle cx="{vx + 50}" cy="{vy + 80}" r="22" fill="#1e3a5f" stroke="#38bdf8" stroke-width="1.5"/>')
        p.append(T(vx + 50, vy + 86, title[0], 18, "#38bdf8", 700, "middle"))
        p.append(T(vx + 90, vy + 72, title, 17, TEXT, 700))
        p.append(T(vx + 90, vy + 98, desc, 13, SUB))

    p.append(
        T(
            W // 2,
            H - 28,
            "docs/taiyiforge-architecture.svg · MIT · python3 scripts/generate-architecture-svg.py",
            12,
            DIM,
            400,
            "middle",
        )
    )

    p.append("</svg>")
    return "\n".join(p)


def export_png() -> None:
    font = next((p for p in FONT_CANDIDATES if Path(p).exists()), None)
    cmd = [
        "npx",
        "--yes",
        "@resvg/resvg-js-cli",
        "--fit-zoom",
        str(PNG_ZOOM),
        "--text-rendering",
        "1",
        "--shape-rendering",
        "2",
        "--dpi",
        str(PNG_DPI),
        str(OUT),
        str(PNG),
    ]
    if font:
        cmd.extend(["--font-file", font, "--font-sans-serif-family", "PingFang SC"])
    print("Export:", " ".join(cmd))
    subprocess.run(cmd, check=True)
    print(f"Wrote {PNG} ({PNG.stat().st_size // 1024} KB, ~{W * PNG_ZOOM}×{H * PNG_ZOOM} px)")


if __name__ == "__main__":
    svg = build()
    OUT.write_text(svg, encoding="utf-8")
    print(f"Wrote {OUT} ({len(svg)} bytes, {W}×{H})")
    try:
        export_png()
    except subprocess.CalledProcessError as exc:
        print(f"PNG export failed: {exc}", file=sys.stderr)
        sys.exit(exc.returncode)
