#!/usr/bin/env python3
"""
Generate TaiyiForge v0.23 architecture poster (zh + en) — identical layout, locale-specific copy.

  python3 scripts/generate-architecture-poster-v023.py
  python3 scripts/generate-architecture-poster-v023.py --locale zh
  python3 scripts/generate-architecture-poster-v023.py --locale en --no-png

Outputs:
  docs/diagrams/visual/taiyiforge-architecture-ai-v023-full-4k-{zh|en}-v3.svg
  docs/diagrams/visual/taiyiforge-architecture-ai-v023-full-4k-{zh|en}-v3.png  (3840×2560)
"""
from __future__ import annotations

import argparse
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "docs" / "diagrams" / "visual"
SKILL_COUNT = len(list((ROOT / "skills").glob("*/SKILL.md")))

W, H = 1920, 1280
PNG_ZOOM = 2  # → 3840×2560

BG = "#060b16"
PANEL = "#0d1528"
PANEL2 = "#111d35"
LINE = "#243049"
TEXT = "#eef2ff"
SUB = "#94a3b8"
DIM = "#64748b"
VERSION = "v0.23.1"

FONT_ZH = "PingFang SC, Microsoft YaHei, system-ui, sans-serif"
FONT_EN = "SF Pro Display, Inter, system-ui, sans-serif"

MAIN_SKILLS = [
    "taiyi-change",
    "taiyi-requirement",
    "taiyi-design",
    "taiyi-ui-design",
    "taiyi-task",
    "taiyi-dev",
    "taiyi-test",
    "taiyi-review",
    "taiyi-integration",
]

AUX_SKILLS = [
    "taiyi-intel-scan",
    "taiyi-architect",
    "taiyi-restyle",
    "taiyi-evolve",
    "taiyi-health",
    "taiyi-compress",
    "taiyi-diagram-pipeline",
    "taiyi-diagram-c4",
    "taiyi-diagram-arch",
    "taiyi-diagram-render",
    "taiyi-diagram-flow",
    "taiyi-forge",
    "taiyi-orchestrator",
    "taiyi-ultrawork",
]

COPY: dict[str, dict] = {
    "zh": {
        "subtitle": "将六大工程标准转化为 AI 可执行工作流",
        "flow": "write → continue → archive",
        "pillars": [
            ("Harness Engineering", "流水线治理", "统一编排 · 可观测 · 可回放 · 可重用", "#0ea5e9"),
            ("OpenSpec", "规格驱动", "结构化规格 · 可选镜像 · 可信性 · 可演进", "#22c55e"),
            ("GStack", "Options + Reason + Cost", "选项 · 理由 · 成本 · 快速决策 · 可退改", "#a855f7"),
            ("Superpowers", "有界 Skill", "有分析 · 可验证 I/O · 可组合 · 可复用 · 可迭代", "#14b8a6"),
            ("OMO", "人机协作", "AI 执行 · 人审批 · 关键节点 · 人负责", "#3b82f6"),
            ("Spec-Kit", "质量五维", "模板契约 · 完整性 · 一致性 · 可验证 · 可维护", "#ec4899"),
        ],
        "artifact_title": "文档档案 ARTIFACT",
        "artifacts": [
            "CHANGE.md",
            "REQUIREMENT.md",
            "DESIGN.md",
            "UI-DESIGN.md",
            "TASK.md",
            "代码+TDD",
            "TEST.md",
            "REVIEW.md",
            "CHANGELOG.md",
            "CONTEXT.md",
            "CONTEXT-COMPACT.md",
            "HANDOFF.md",
        ],
        "gate_title": "三重门控机制",
        "gates": [
            ("人工门", "change / design / review — approver"),
            ("质量门", "完整性 · 一致性 · 可验证性 · 可追溯性 · 工程质量"),
            ("交付门", "commit → 干净工作树 → audit"),
        ],
        "entries": [
            ("taiyi-forge.sh", "入口脚本"),
            ("taiyi CLI", "命令行入口"),
            ("OpenCode plugin", "IDE 插件"),
            ("taiyi-mcp", "MCP 服务"),
        ],
        "profiles": "full · api · ai · lite · spike · micro · nano",
        "hub_title": "AI 工作流引擎",
        "hub_file": "workflow-engine.ts",
        "hub_orbits": ["意图分析", "Token 预算", "Harness 编排", "路由决策", "状态追踪"],
        "hub_chips": ["audit", "verify", "health", "delivery-gate"],
        "phases": [
            ("1", "变更提案", "CHANGE.md"),
            ("2", "需求分析", "REQUIREMENT.md"),
            ("3", "技术设计", "DESIGN.md"),
            ("4", "UI 设计", "UI-DESIGN.md"),
            ("5", "任务拆分", "TASK.md"),
            ("6", "开发执行", "代码+TDD"),
            ("7", "测试执行", "TEST.md"),
            ("8", "代码审查", "REVIEW.md"),
            ("9", "集成交付", "CHANGELOG.md"),
        ],
        "daily_label": "日常节奏",
        "daily": ["/taiyi:new", "verify", "continue", "integration", "archive"],
        "delivery_label": "交付链",
        "delivery": ["commit", "verify", "ship", "land", "release", "archive"],
        "skill_title": f"Skill 全景（{SKILL_COUNT}）",
        "modes_label": "运行模式",
        "modes": ["ralph", "autopilot", "ultrawork", "team", "daemon"],
        "platforms": ["OpenCode", "Claude", "Codex", "Cursor"],
        "values": [
            ("标准化", "统一工程标准 · 降低复杂度"),
            ("可追溯", "全链路可溯源 · 可审计"),
            ("可执行", "AI 执行 · 人审核 · 可落地"),
            ("高质量交付", "五维质量门禁 · 持续改进"),
            ("知识沉淀", "知识资产化 · 持续演进"),
        ],
    },
    "en": {
        "subtitle": "Six Engineering Standards → One AI-Executable Workflow",
        "flow": "write → continue → archive",
        "pillars": [
            ("Harness Engineering", "Pipeline governance", "Unified orchestration · Observable · Replayable · Reusable", "#0ea5e9"),
            ("OpenSpec", "Spec-driven", "Structured specs · Optional mirror · Trustworthy · Evolvable", "#22c55e"),
            ("GStack", "Options + Reason + Cost", "Options · Rationale · Cost · Fast decisions · Reversible", "#a855f7"),
            ("Superpowers", "Bounded Skills", "Analytical · Verifiable I/O · Composable · Reusable · Iterative", "#14b8a6"),
            ("OMO", "Human–AI Collaboration", "AI executes · Human approves · Critical nodes · Human accountable", "#3b82f6"),
            ("Spec-Kit", "Quality five dimensions", "Template contracts · Completeness · Consistency · Verifiability · Maintainable", "#ec4899"),
        ],
        "artifact_title": "ARTIFACTS",
        "artifacts": [
            "CHANGE.md",
            "REQUIREMENT.md",
            "DESIGN.md",
            "UI-DESIGN.md",
            "TASK.md",
            "Code+TDD",
            "TEST.md",
            "REVIEW.md",
            "CHANGELOG.md",
            "CONTEXT.md",
            "CONTEXT-COMPACT.md",
            "HANDOFF.md",
        ],
        "gate_title": "TRIPLE GATE MECHANISM",
        "gates": [
            ("Human Gate", "change / design / review — approver"),
            ("Quality Gate", "Completeness · Consistency · Verifiability · Traceability · Engineering quality"),
            ("Delivery Gate", "commit → clean working tree → audit"),
        ],
        "entries": [
            ("taiyi-forge.sh", "shell entry"),
            ("taiyi CLI", "CLI entry"),
            ("OpenCode plugin", "IDE plugin"),
            ("taiyi-mcp", "MCP server"),
        ],
        "profiles": "full · api · ai · lite · spike · micro · nano",
        "hub_title": "AI Workflow Engine",
        "hub_file": "workflow-engine.ts",
        "hub_orbits": [
            "Intent analysis",
            "Token budget",
            "Harness orchestration",
            "Routing decisions",
            "State tracking",
        ],
        "hub_chips": ["audit", "verify", "health", "delivery-gate"],
        "phases": [
            ("1", "Change Proposal", "CHANGE.md"),
            ("2", "Requirements Analysis", "REQUIREMENT.md"),
            ("3", "Technical Design", "DESIGN.md"),
            ("4", "UI Design", "UI-DESIGN.md"),
            ("5", "Task Breakdown", "TASK.md"),
            ("6", "Dev Execution", "Code+TDD"),
            ("7", "Test Execution", "TEST.md"),
            ("8", "Code Review", "REVIEW.md"),
            ("9", "Integration & Delivery", "CHANGELOG.md"),
        ],
        "daily_label": "Daily rhythm",
        "daily": ["/taiyi:new", "verify", "continue", "integration", "archive"],
        "delivery_label": "Delivery chain",
        "delivery": ["commit", "verify", "ship", "land", "release", "archive"],
        "skill_title": f"Skill landscape ({SKILL_COUNT})",
        "modes_label": "Runtime modes",
        "modes": ["ralph", "autopilot", "ultrawork", "team", "daemon"],
        "platforms": ["OpenCode", "Claude", "Codex", "Cursor"],
        "values": [
            ("Standardization", "Unified engineering standards · Lower complexity"),
            ("Traceability", "End-to-end provenance · Auditable"),
            ("Executability", "AI executes · Human reviews · Shippable"),
            ("High-quality delivery", "Five-dimension quality gate · Continuous improvement"),
            ("Knowledge accumulation", "Assetized knowledge · Continuous evolution"),
        ],
    },
}


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;")


def t(x, y, s, size=13, fill=TEXT, weight=500, anchor="start", font=FONT_ZH) -> str:
    return (
        f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}" font-weight="{weight}" '
        f'text-anchor="{anchor}" font-family="{font}">{esc(s)}</text>'
    )


def box(x, y, w, h, fill=PANEL, stroke=LINE, rx=10, sw=1.4) -> str:
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def chip(x, y, w, h, label, fill, stroke) -> str:
    return (
        box(x, y, w, h, PANEL2, stroke, 8, 1.2)
        + t(x + w / 2, y + h / 2 + 5, label, 11, fill, 600, "middle")
    )


def build(locale: str) -> str:
    c = COPY[locale]
    font = FONT_ZH if locale == "zh" else FONT_EN
    p: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
        '<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">'
        '<path d="M0,0 L8,4 L0,8 Z" fill="#64748b"/></marker></defs>',
        f'<rect width="{W}" height="{H}" fill="{BG}"/>',
        # grid
        '<g opacity="0.12" stroke="#1e293b" stroke-width="1">'
        + "".join(f'<line x1="0" y1="{y}" x2="{W}" y2="{y}"/>' for y in range(0, H, 32))
        + "".join(f'<line x1="{x}" y1="0" x2="{x}" y2="{H}"/>' for x in range(0, W, 32))
        + "</g>",
        t(W // 2, 52, "TaiyiForge", 40, TEXT, 800, "middle", font),
        t(W // 2, 82, f"{c['subtitle']} · {VERSION} · {c['flow']}", 14, SUB, 500, "middle", font),
    ]

    # six pillars
    pw, ph, gap, x0, py = 290, 72, 10, 40, 100
    for i, (title, sub, desc, col) in enumerate(c["pillars"]):
        x = x0 + i * (pw + gap)
        p.append(box(x, py, pw, ph, PANEL2, col, 10, 1.6))
        p.append(t(x + 12, py + 22, title, 12, TEXT, 700, "start", font))
        p.append(t(x + 12, py + 38, sub, 10, col, 600, "start", font))
        p.append(t(x + 12, py + 56, desc, 9, SUB, 400, "start", font))

    my, mh = 188, 430
    lx, lw = 40, 220
    rx, rw = W - 260, 220
    cx, cw = 270, W - 540

    p.append(box(lx, my, lw, mh, PANEL, "#3b82f6", 12, 1.8))
    p.append(box(cx, my, cw, mh, PANEL, "#475569", 12, 1.4))
    p.append(box(rx, my, rw, mh, PANEL, "#f43f5e", 12, 1.8))

    p.append(t(lx + 12, my + 24, c["artifact_title"], 13, "#60a5fa", 700, "start", font))
    for i, name in enumerate(c["artifacts"]):
        ay = my + 40 + i * 31
        p.append(box(lx + 10, ay, lw - 20, 26, PANEL2, LINE, 6, 1))
        p.append(t(lx + 18, ay + 18, name, 10, TEXT, 500, "start", "JetBrains Mono, monospace"))

    p.append(t(rx + 12, my + 24, c["gate_title"], 13, "#fb7185", 700, "start", font))
    for i, (gt, gd) in enumerate(c["gates"]):
        gy = my + 44 + i * 128
        p.append(box(rx + 10, gy, rw - 20, 112, PANEL2, "#eab308", 10, 1.4))
        p.append(t(rx + 20, gy + 28, gt, 12, TEXT, 700, "start", font))
        p.append(t(rx + 20, gy + 52, gd, 9, SUB, 400, "start", font))

    # entries
    ew = (cw - 30) // 4
    for i, (name, sub) in enumerate(c["entries"]):
        ex = cx + 12 + i * (ew + 2)
        p.append(box(ex, my + 12, ew - 4, 42, PANEL2, "#38bdf8", 8, 1.2))
        p.append(t(ex + (ew - 4) / 2, my + 28, name, 9, "#38bdf8", 600, "middle", "JetBrains Mono, monospace"))
        p.append(t(ex + (ew - 4) / 2, my + 42, sub, 8, DIM, 400, "middle", font))

    p.append(t(cx + cw // 2, my + 62, c["profiles"], 9, DIM, 400, "middle", "JetBrains Mono, monospace"))

    hub_x, hub_y = cx + cw // 2, my + 118
    p.append(f'<circle cx="{hub_x}" cy="{hub_y}" r="52" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/>')
    p.append(t(hub_x, hub_y - 6, c["hub_title"], 11, "#38bdf8", 700, "middle", font))
    p.append(t(hub_x, hub_y + 12, c["hub_file"], 9, SUB, 400, "middle", "JetBrains Mono, monospace"))

    orbit_r = 95
    for i, label in enumerate(c["hub_orbits"]):
        ang = -90 + i * 72
        rad = math.radians(ang)
        ox = hub_x + orbit_r * math.cos(rad)
        oy = hub_y + orbit_r * math.sin(rad)
        p.append(box(ox - 54, oy - 14, 108, 28, PANEL2, LINE, 6, 1))
        p.append(t(ox, oy + 4, label, 8, SUB, 500, "middle", font))

    chip_w = 68
    for i, label in enumerate(c["hub_chips"]):
        p.append(chip(cx + 20 + i * (chip_w + 6), my + 168, chip_w, 22, label, "#38bdf8", "#334155"))

    # nine phases
    sw, sg, sy = 118, 6, my + 210
    total = 9 * sw + 8 * sg
    px0 = cx + (cw - total) // 2
    cols = ["#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", "#34d399", "#2dd4bf", "#fbbf24", "#fb923c"]
    for i, (n, title, out) in enumerate(c["phases"]):
        px = px0 + i * (sw + sg)
        col = cols[i]
        p.append(box(px, sy, sw, 88, PANEL2, col, 8, 1.4))
        p.append(t(px + 14, sy + 20, n, 14, col, 800, "start", font))
        p.append(t(px + 10, sy + 38, title, 9, TEXT, 600, "start", font))
        p.append(t(px + 10, sy + 54, f"→ {out}", 8, DIM, 400, "start", "JetBrains Mono, monospace"))
        if i < 8:
            p.append(
                f'<line x1="{px + sw}" y1="{sy + 44}" x2="{px + sw + sg}" y2="{sy + 44}" '
                f'stroke="{LINE}" stroke-width="1.5" marker-end="url(#arr)"/>'
            )

    # timelines
    ty = my + mh + 16
    def draw_flow(y, label, steps):
        p.append(t(52, y + 16, label, 11, SUB, 600, "start", font))
        x = 180
        colors = ["#2563eb", "#0891b2", "#7c3aed", "#ea580c", "#16a34a", "#1e3a8a"]
        for i, step in enumerate(steps):
            col = colors[i % len(colors)]
            w = max(72, len(step) * 7 + 20)
            p.append(chip(x, y, w, 26, step, TEXT, col))
            x += w + 14

    draw_flow(ty, c["daily_label"], c["daily"])
    draw_flow(ty + 38, c["delivery_label"], c["delivery"])

    # skills — 9 + 14 in two rows
    sy2 = ty + 88
    p.append(box(40, sy2, W - 80, 200, PANEL, "#6366f1", 12, 1.6))
    p.append(t(W // 2, sy2 + 22, c["skill_title"], 14, TEXT, 700, "middle", font))

    def skill_row(y, skills, cols_per_row):
        sw2 = (W - 120) // cols_per_row
        for i, name in enumerate(skills):
            sx = 60 + (i % cols_per_row) * sw2
            sy3 = y + (i // cols_per_row) * 34
            p.append(box(sx, sy3, sw2 - 8, 28, PANEL2, LINE, 6, 1))
            p.append(t(sx + (sw2 - 8) / 2, sy3 + 18, name, 8, "#22d3ee", 500, "middle", "JetBrains Mono, monospace"))

    skill_row(sy2 + 34, MAIN_SKILLS, 9)
    skill_row(sy2 + 72, AUX_SKILLS, 7)

    my2 = sy2 + 158
    p.append(t(52, my2 + 14, c["modes_label"], 10, SUB, 600, "start", font))
    x = 180
    for i, m in enumerate(c["modes"]):
        p.append(chip(x, my2, 88, 24, m, TEXT, "#a855f7"))
        x += 102
        if i < len(c["modes"]) - 1:
            p.append(t(x - 8, my2 + 16, "→", 10, DIM, 400, "middle", font))
            x += 8

    py2 = sy2 + 210
    pw2 = (W - 120) // 4
    for i, name in enumerate(c["platforms"]):
        px = 60 + i * pw2
        p.append(box(px, py2, pw2 - 10, 36, PANEL2, "#38bdf8", 8, 1.2))
        p.append(t(px + (pw2 - 10) / 2, py2 + 24, name, 12, TEXT, 600, "middle", font))

    vy = py2 + 56
    vw = (W - 100) // 5
    for i, (title, desc) in enumerate(c["values"]):
        vx = 50 + i * vw
        p.append(box(vx, vy, vw - 10, 64, PANEL2, "#38bdf8", 8, 1.2))
        p.append(t(vx + 10, vy + 22, title, 11, TEXT, 700, "start", font))
        p.append(t(vx + 10, vy + 42, desc, 8, SUB, 400, "start", font))

    p.append(t(W - 50, H - 16, VERSION, 10, DIM, 400, "end", font))
    p.append("</svg>")
    return "\n".join(p)


def export_png(svg_path: Path, png_path: Path) -> None:
    font = "/System/Library/Fonts/PingFang.ttc"
    cmd = [
        "npx",
        "--yes",
        "@resvg/resvg-js-cli",
        "--fit-zoom",
        str(PNG_ZOOM),
        str(svg_path),
        str(png_path),
    ]
    if Path(font).exists():
        cmd.extend(["--font-file", font, "--font-sans-serif-family", "PingFang SC"])
    subprocess.run(cmd, check=True, cwd=ROOT)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locale", choices=["zh", "en", "both"], default="both")
    parser.add_argument("--no-png", action="store_true")
    args = parser.parse_args()
    locales = ["zh", "en"] if args.locale == "both" else [args.locale]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for loc in locales:
        svg = build(loc)
        svg_path = OUT_DIR / f"taiyiforge-architecture-ai-v023-full-4k-{loc}-v3.svg"
        png_path = OUT_DIR / f"taiyiforge-architecture-ai-v023-full-4k-{loc}-v3.png"
        svg_path.write_text(svg, encoding="utf-8")
        print(f"Wrote {svg_path}")
        if not args.no_png:
            export_png(svg_path, png_path)
            print(f"Wrote {png_path} ({W * PNG_ZOOM}×{H * PNG_ZOOM})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
