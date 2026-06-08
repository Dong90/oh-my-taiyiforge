#!/usr/bin/env python3
"""Generate TaiyiForge architecture diagram SVG (Flow-X style, layered layout)."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "docs" / "taiyiforge-architecture.svg"
PNG = OUT.with_suffix(".png")

# Native canvas — no nested scale(); sharpness comes from PNG export zoom
W, H = 1800, 2100
PNG_ZOOM = 4
PNG_DPI = 300

FONT = "PingFang SC, Microsoft YaHei, system-ui, sans-serif"
FONT_CANDIDATES = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]

# ── Data ─────────────────────────────────────────────────────────────────────

PILLARS = [
    ("#0ea5e9", "Harness", "流水线治理 · 不达标不进"),
    ("#8b5cf6", "OpenSpec", "规格驱动 · 可选镜像"),
    ("#14b8a6", "GStack", "Options + Reason + Cost"),
    ("#f59e0b", "Superpowers", "有界 Skill · 可验证 I/O"),
    ("#ec4899", "OMO", "AI 执行 · 人审批"),
    ("#6366f1", "Spec-Kit", "templates + 质量五维"),
]

PHASE_ARTIFACTS = [
    ("CHANGE.md", "变更提案"),
    ("REQUIREMENT.md", "需求 + AC"),
    ("DESIGN.md", "技术设计 / ADR"),
    ("UI-DESIGN.md", "UI 契约"),
    ("TASK.md", "任务切片"),
    ("代码 + 测试", "TDD 产出"),
    ("TEST.md", "测试报告"),
    ("REVIEW.md", "审查报告"),
    ("CHANGELOG.md", "集成交付"),
]

RUNTIME_ARTIFACTS = [
    ("HANDOFF.md", "跨会话恢复"),
    ("project-memory.json", "跨变更记忆"),
    (".taiyi/runtime/*", "模式状态"),
    ("adr/ · CONTEXT.md", "决策 · 情报"),
]

STAGES = [
    ("1", "变更", "taiyi-change", "CHANGE.md", "#38bdf8"),
    ("2", "需求", "taiyi-requirement", "REQ.md", "#60a5fa"),
    ("3", "设计", "taiyi-design", "DESIGN.md", "#818cf8"),
    ("4", "UI", "taiyi-ui-design", "UI-DESIGN", "#a78bfa"),
    ("5", "任务", "taiyi-task", "TASK.md", "#c084fc"),
    ("6", "开发", "taiyi-dev", "代码+TDD", "#34d399"),
    ("7", "测试", "taiyi-test", "TEST.md", "#2dd4bf"),
    ("8", "审查", "taiyi-review", "REVIEW.md", "#fbbf24"),
    ("9", "交付", "taiyi-integration", "CHANGELOG", "#fb923c"),
]

OMC_RUNTIME = [
    ("ralph", "验证循环", "ralplan-first · step hook", "#f472b6"),
    ("autopilot", "九阶段全自动", "--auto harness", "#fb923c"),
    ("team", "team 流水线", "plan→prd→exec→fix", "#38bdf8"),
    ("ultrawork", "高吞吐并行", "≤6 路 spawn", "#a78bfa"),
]

OMC_WORKFLOW_ROW1 = ["plan", "ralplan", "ultraqa", "ccg", "sciomc"]
OMC_WORKFLOW_ROW2 = ["deepinit", "visual-verdict", "deep-interview", "ai-slop-cleaner", "external-context"]

OMC_CONTROLS = [
    ("29 Agent", "/taiyi:agent · agent-roles.yaml"),
    ("记忆", "/taiyi:remember"),
    ("停止", "stop-mode · stopomc"),
    ("调度", "modes · step · keyword hook"),
    ("MCP", "state_get_status / read / list"),
]

VALUES = [
    ("标准化", "减少不确定性"),
    ("可追溯", "文档逐层审计"),
    ("可控执行", "AI 执行 · 人把关"),
    ("高质量交付", "三门禁持续改进"),
    ("知识沉淀", "经验归档演进"),
]


# ── SVG helpers ──────────────────────────────────────────────────────────────

def layer_label(y: int, num: str, title: str, color: str = "#475569") -> str:
    return f"""
  <g transform="translate(24,{y})">
    <rect x="0" y="0" width="4" height="28" rx="2" fill="{color}"/>
    <text x="14" y="14" fill="{color}" font-size="13" font-weight="700">{num}</text>
    <text x="14" y="28" fill="#94a3b8" font-size="12">{title}</text>
  </g>"""


def section_box(x: int, y: int, w: int, h: int, stroke: str, title: str, subtitle: str = "") -> str:
    sub = f'<text x="16" y="52" fill="#64748b" font-size="11">{subtitle}</text>' if subtitle else ""
    return f"""
  <g transform="translate({x},{y})">
    <rect x="0" y="0" width="{w}" height="{h}" rx="12" fill="#0f172a" stroke="{stroke}" stroke-width="1.8" filter="url(#cardGlow)"/>
    <text x="16" y="32" fill="{stroke}" font-size="16" font-weight="700">{title}</text>
    {sub}
  </g>"""


def stage_card(x: int, y: int, num: str, title: str, skill: str, output: str, color: str) -> str:
    return f"""
  <g transform="translate({x},{y})">
    <rect x="0" y="0" width="148" height="112" rx="10" fill="#1e293b" stroke="{color}" stroke-width="1.6" filter="url(#cardGlow)"/>
    <circle cx="22" cy="22" r="14" fill="{color}" opacity="0.25"/>
    <text x="22" y="27" text-anchor="middle" fill="{color}" font-size="13" font-weight="800">{num}</text>
    <text x="44" y="26" fill="#f1f5f9" font-size="14" font-weight="700">{title}</text>
    <text x="12" y="52" fill="#cbd5e1" font-size="12">{skill}</text>
    <text x="12" y="72" fill="#94a3b8" font-size="11">→ {output}</text>
    <rect x="12" y="84" width="124" height="18" rx="4" fill="{color}" opacity="0.15"/>
    <text x="74" y="97" text-anchor="middle" fill="{color}" font-size="10">Skill 驱动</text>
  </g>"""


def pillar(x: int, y: int, color: str, title: str, desc: str) -> str:
    return f"""
  <g transform="translate({x},{y})">
    <rect x="0" y="0" width="268" height="78" rx="10" fill="#1e293b" stroke="{color}" stroke-width="1.4" filter="url(#cardGlow)"/>
    <text x="14" y="28" fill="#f8fafc" font-size="15" font-weight="700">{title}</text>
    <text x="14" y="50" fill="{color}" font-size="12">{desc}</text>
  </g>"""


def omc_card(x: int, y: int, name: str, title: str, desc: str, color: str) -> str:
    return f"""
  <g transform="translate({x},{y})">
    <rect x="0" y="0" width="320" height="88" rx="10" fill="#1e293b" stroke="{color}" stroke-width="1.5" filter="url(#cardGlow)"/>
    <text x="14" y="28" fill="{color}" font-size="15" font-weight="700">/taiyi:{name}</text>
    <text x="14" y="50" fill="#e2e8f0" font-size="13">{title}</text>
    <text x="14" y="72" fill="#94a3b8" font-size="11">{desc}</text>
  </g>"""


def chip_row(items: list[str], x: int, y: int, color: str, gap: int = 10) -> tuple[str, int]:
    parts: list[str] = []
    cx = x
    for label in items:
        w = max(52, len(label) * 8 + 24)
        parts.append(f"""
  <g transform="translate({cx},{y})">
    <rect x="0" y="0" width="{w}" height="26" rx="6" fill="#1e293b" stroke="{color}" stroke-width="1"/>
    <text x="{w/2}" y="18" text-anchor="middle" fill="#e2e8f0" font-size="12">{label}</text>
  </g>""")
        cx += w + gap
    return "".join(parts), cx


def artifact_list(items: list[tuple[str, str]], x: int, y: int, name_color: str = "#38bdf8") -> str:
    parts: list[str] = []
    cy = y
    for name, desc in items:
        parts.append(f"""
    <rect x="{x}" y="{cy}" width="248" height="36" rx="6" fill="#172554" stroke="#334155"/>
    <text x="{x+10}" y="{cy+16}" fill="{name_color}" font-size="12" font-weight="600">{name}</text>
    <text x="{x+10}" y="{cy+30}" fill="#94a3b8" font-size="10">{desc}</text>""")
        cy += 40
    return "\n".join(parts)


# ── Build SVG ────────────────────────────────────────────────────────────────

parts: list[str] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="{FONT}">',
    """  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#050a14"/>
      <stop offset="100%" stop-color="#0c1525"/>
    </linearGradient>
    <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
    <filter id="cardGlow" x="-8%" y="-8%" width="116%" height="116%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#38bdf8" flood-opacity="0.15"/>
    </filter>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#38bdf8" opacity="0.85"/>
    </marker>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#1e293b" stroke-width="0.6" opacity="0.35"/>
    </pattern>
  </defs>""",
    f'  <rect width="{W}" height="{H}" fill="url(#bgGrad)"/>',
    f'  <rect width="{W}" height="{H}" fill="url(#grid)"/>',
    # Title
    '  <text x="900" y="52" text-anchor="middle" fill="#f8fafc" font-size="42" font-weight="800">TaiyiForge</text>',
    '  <text x="900" y="86" text-anchor="middle" fill="#94a3b8" font-size="17">六大工程规范 → 九阶段文档驱动 → OMC 原生控制面 · 四端统一 · v0.22</text>',
    '  <line x1="120" y1="100" x2="1680" y2="100" stroke="#334155" stroke-width="1"/>',
]

# L1 — Standards
parts.append(layer_label(112, "L1", "工程标准层", "#60a5fa"))
for i, (color, title, desc) in enumerate(PILLARS):
    parts.append(pillar(120 + i * 280, 108, color, title, desc))

# L2 — Three columns: Artifacts | Engine | Gates
parts.append(layer_label(208, "L2", "引擎控制层", "#38bdf8"))

# Left — Artifacts
parts.append(section_box(120, 200, 280, 540, "#3b82f6", "ARTIFACT 文档体系", ".taiyi/changes/&lt;slug&gt;/ 真源 · 分层依赖"))
parts.append('  <text x="136" y="268" fill="#64748b" font-size="11" font-weight="600">九阶段工件</text>')
parts.append(artifact_list(PHASE_ARTIFACTS, 136, 278))
parts.append('  <text x="136" y="658" fill="#64748b" font-size="11" font-weight="600">运行时 / 辅助</text>')
parts.append(artifact_list(RUNTIME_ARTIFACTS, 136, 668, "#22d3ee"))

# Right — Gates
parts.append(section_box(1400, 200, 280, 540, "#f43f5e", "三重门禁", "complete 前全部通过方可 advance"))
parts.append("""
  <g transform="translate(1416,268)">
    <rect x="0" y="0" width="248" height="108" rx="8" fill="#3f0d1a" stroke="#fb7185" stroke-width="1.2"/>
    <text x="12" y="28" fill="#fecdd3" font-size="14" font-weight="700">① Human Approval</text>
    <text x="12" y="50" fill="#fda4af" font-size="12">人工审批 · OMO 人把关</text>
    <text x="12" y="72" fill="#fecdd3" font-size="11">change / design / review</text>
    <text x="12" y="92" fill="#94a3b8" font-size="10">gates/human-gate.ts</text>
  </g>
  <g transform="translate(1416,388)">
    <rect x="0" y="0" width="248" height="118" rx="8" fill="#1a2e1a" stroke="#4ade80" stroke-width="1.2"/>
    <text x="12" y="28" fill="#86efac" font-size="14" font-weight="700">② Quality Gate</text>
    <text x="12" y="50" fill="#bbf7d0" font-size="12">完整性 · 一致性 · 可验证性</text>
    <text x="12" y="72" fill="#dcfce7" font-size="11">可追溯性 · 工程质量</text>
    <text x="12" y="96" fill="#94a3b8" font-size="10">quality-gate.yaml 五维</text>
  </g>
  <g transform="translate(1416,518)">
    <rect x="0" y="0" width="248" height="108" rx="8" fill="#1a1a3a" stroke="#818cf8" stroke-width="1.2"/>
    <text x="12" y="28" fill="#a5b4fc" font-size="14" font-weight="700">③ Delivery Gate</text>
    <text x="12" y="50" fill="#c7d2fe" font-size="12">integration 前 · git 干净</text>
    <text x="12" y="72" fill="#e0e7ff" font-size="11">有新 commit · audit/verify</text>
    <text x="12" y="96" fill="#94a3b8" font-size="10">archive 前 sync-openspec</text>
  </g>
""")

# Center — Engine (INPUT | HUB | OUTPUT)
parts.append("""
  <g transform="translate(430,200)">
    <rect x="0" y="0" width="940" height="540" rx="14" fill="none" stroke="#334155" stroke-width="1" stroke-dasharray="6 4"/>
    <text x="470" y="28" text-anchor="middle" fill="#64748b" font-size="13" font-weight="600">TAIYIFORGE CORE ENGINE</text>
  </g>
""")

parts.append("""
  <g transform="translate(450,250)">
    <rect x="0" y="0" width="240" height="460" rx="10" fill="#0f1d3a" stroke="#2563eb" stroke-width="1.4"/>
    <text x="16" y="32" fill="#60a5fa" font-size="15" font-weight="700">INPUT 输入</text>
    <text x="16" y="58" fill="#94a3b8" font-size="12">统一入口</text>
    <text x="16" y="82" fill="#cbd5e1" font-size="12">· taiyi CLI / forge.sh</text>
    <text x="16" y="104" fill="#cbd5e1" font-size="12">· OpenCode taiyi_* 工具</text>
    <text x="16" y="126" fill="#cbd5e1" font-size="12">· /taiyi:* 四端斜杠</text>
    <text x="16" y="158" fill="#94a3b8" font-size="12">分析与路由</text>
    <text x="16" y="182" fill="#cbd5e1" font-size="12">· 意图分析 · 复杂度</text>
    <text x="16" y="204" fill="#cbd5e1" font-size="12">· profile full/api/lite</text>
    <text x="16" y="226" fill="#cbd5e1" font-size="12">· Token 预算 · 压缩</text>
    <text x="16" y="258" fill="#94a3b8" font-size="12">状态与校验</text>
    <text x="16" y="282" fill="#cbd5e1" font-size="12">· state.json 追踪</text>
    <text x="16" y="304" fill="#cbd5e1" font-size="12">· artifact 前置检测</text>
    <text x="16" y="326" fill="#cbd5e1" font-size="12">· harness blockers</text>
    <text x="16" y="358" fill="#94a3b8" font-size="12">模式编排</text>
    <text x="16" y="382" fill="#f472b6" font-size="12">· mode-orchestrator</text>
    <text x="16" y="404" fill="#f472b6" font-size="12">· keyword-modes · step</text>
  </g>
""")

parts.append("""
  <circle cx="900" cy="460" r="130" fill="url(#hubGlow)" opacity="0.8"/>
  <circle cx="900" cy="460" r="95" fill="#0f172a" stroke="#38bdf8" stroke-width="3" filter="url(#cardGlow)"/>
  <text x="900" y="440" text-anchor="middle" fill="#38bdf8" font-size="18" font-weight="800">CORE</text>
  <text x="900" y="464" text-anchor="middle" fill="#a5b4fc" font-size="14" font-weight="600">ENGINE</text>
  <text x="900" y="488" text-anchor="middle" fill="#94a3b8" font-size="12">workflow-engine</text>
  <path d="M 690 460 L 800 460" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrow)"/>
  <path d="M 1000 460 L 1110 460" stroke="#10b981" stroke-width="2" marker-end="url(#arrow)"/>
""")

parts.append("""
  <g transform="translate(1110,250)">
    <rect x="0" y="0" width="240" height="460" rx="10" fill="#0f1f1a" stroke="#059669" stroke-width="1.4"/>
    <text x="16" y="32" fill="#34d399" font-size="15" font-weight="700">OUTPUT 输出</text>
    <text x="16" y="58" fill="#94a3b8" font-size="12">阶段推进</text>
    <text x="16" y="82" fill="#cbd5e1" font-size="12">· complete / advance</text>
    <text x="16" y="104" fill="#cbd5e1" font-size="12">· continue / apply</text>
    <text x="16" y="126" fill="#cbd5e1" font-size="12">· harness 编排</text>
    <text x="16" y="158" fill="#94a3b8" font-size="12">门禁与交付</text>
    <text x="16" y="182" fill="#cbd5e1" font-size="12">· 三门禁校验</text>
    <text x="16" y="204" fill="#cbd5e1" font-size="12">· delivery-gate</text>
    <text x="16" y="226" fill="#cbd5e1" font-size="12">· commit-trailers</text>
    <text x="16" y="258" fill="#94a3b8" font-size="12">排查与归档</text>
    <text x="16" y="282" fill="#cbd5e1" font-size="12">· audit · verify · health</text>
    <text x="16" y="304" fill="#cbd5e1" font-size="12">· sync-openspec</text>
    <text x="16" y="326" fill="#cbd5e1" font-size="12">· 根 CHANGELOG 合并</text>
    <text x="16" y="358" fill="#94a3b8" font-size="12">OMC 运行时</text>
    <text x="16" y="382" fill="#f472b6" font-size="12">· ralph / autopilot</text>
    <text x="16" y="404" fill="#f472b6" font-size="12">· team / ultrawork</text>
  </g>
""")

# L3 — Nine phases (single horizontal pipeline)
parts.append(layer_label(752, "L3", "九阶段主流程", "#34d399"))
parts.append('  <text x="900" y="792" text-anchor="middle" fill="#64748b" font-size="13">profile: full·9 · api·8 · lite·5 · continue 每轮推进一阶段 · 左→右严格依赖</text>')

sx, sy = 132, 806
card_w, gap = 148, 12
for i, stage in enumerate(STAGES):
    parts.append(stage_card(sx + i * (card_w + gap), sy, *stage))
    if i < 8:
        x1 = sx + i * (card_w + gap) + card_w
        x2 = x1 + gap
        parts.append(f'  <line x1="{x1}" y1="{sy+56}" x2="{x2}" y2="{sy+56}" stroke="#475569" stroke-width="2" marker-end="url(#arrow)" opacity="0.7"/>')

parts.append('  <path d="M 900 918 L 900 948" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)" opacity="0.6"/>')

# L4 — Iron triangle
parts.append(layer_label(958, "L4", "铁三角增强", "#a78bfa"))
parts.append("""
  <g transform="translate(120,950)">
    <rect x="0" y="0" width="1560" height="96" rx="12" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.4"/>
    <text x="20" y="34" fill="#a5b4fc" font-size="15" font-weight="700">分阶段 optional 打卡 · --auto 下不阻塞 complete</text>
    <text x="20" y="60" fill="#c7d2fe" font-size="13">Superpowers: brainstorming · TDD · verification · subagent</text>
    <text x="20" y="82" fill="#c7d2fe" font-size="13">GStack: plan-eng-review · plan-design-review · qa · document-release</text>
    <text x="820" y="60" fill="#c7d2fe" font-size="13">OpenSpec: sync-openspec · archive 前自动 sync</text>
    <text x="820" y="82" fill="#94a3b8" font-size="12">四端: OpenCode · Claude · Codex · Cursor · 可与 OMX 并存</text>
  </g>
""")

# L5 — OMC (3 clear columns)
parts.append(layer_label(1078, "L5", "OMC 原生控制面", "#f472b6"))
parts.append("""
  <g transform="translate(120,1070)">
    <rect x="0" y="0" width="1560" height="320" rx="14" fill="#1a0f2e" stroke="#ec4899" stroke-width="1.6" filter="url(#cardGlow)"/>
    <text x="20" y="36" fill="#f472b6" font-size="18" font-weight="700">自 OMC 迁移 · 不依赖 oh-my-claudecode · docs/taiyi/omc-reference.md</text>
    <text x="20" y="60" fill="#94a3b8" font-size="12">运行时模式（.taiyi/runtime/*-mode.json）· step/stop hook 防 Agent 早停</text>
  </g>
""")

for i, (name, title, desc, color) in enumerate(OMC_RUNTIME):
    parts.append(omc_card(140 + i * 380, 1098, name, title, desc, color))

parts.append('  <text x="140" y="1210" fill="#fcd34d" font-size="14" font-weight="600">Workflow 斜杠</text>')
row1, _ = chip_row(OMC_WORKFLOW_ROW1, 140, 1220, "#f59e0b", 12)
parts.append(row1)
row2, _ = chip_row(OMC_WORKFLOW_ROW2, 140, 1258, "#f59e0b", 12)
parts.append(row2)

parts.append('  <text x="140" y="1310" fill="#86efac" font-size="14" font-weight="600">控制 &amp; MCP 对齐</text>')
for i, (label, desc) in enumerate(OMC_CONTROLS):
    parts.append(f"""
  <g transform="translate({140 + i * 300},1320)">
    <rect x="0" y="0" width="280" height="52" rx="8" fill="#1e293b" stroke="#4ade80" stroke-width="1.2"/>
    <text x="14" y="24" fill="#86efac" font-size="13" font-weight="700">{label}</text>
    <text x="14" y="42" fill="#94a3b8" font-size="11">{desc}</text>
  </g>""")

parts.append("""
  <g transform="translate(1280,1220)">
    <rect x="0" y="0" width="380" height="140" rx="10" fill="#1e293b" stroke="#c084fc" stroke-width="1.2"/>
    <text x="16" y="32" fill="#c4b5fd" font-size="14" font-weight="700">ralph ↔ review-loop</text>
    <text x="16" y="56" fill="#e9d5ff" font-size="12">ralph: 验证命令循环（测试/build）</text>
    <text x="16" y="78" fill="#e9d5ff" font-size="12">review-loop: REVIEW.md 机器门禁</text>
    <text x="16" y="108" fill="#94a3b8" font-size="11">review 阶段通常两者联用</text>
  </g>
""")

# L6 — Skill ecosystem (category boxes, not cramped robots)
parts.append(layer_label(1422, "L6", "Skill 生态", "#4ade80"))
skill_cats = [
    ("主流程 ×9", "taiyi-change → … → taiyi-integration", "#38bdf8", 120),
    ("辅助 ×6", "intel-scan · architect · health · evolve · restyle · compress", "#2dd4bf", 420),
    ("编排 ×3", "orchestrator · forge · ultrawork", "#fcd34d", 720),
    ("斜杠 ×40+", "status · continue · handoff · doctor · audit · verify …", "#fb923c", 1020),
    ("OMC workflow", "ralph · autopilot · team · plan · ccg · sciomc …", "#f472b6", 1320),
]
for title, desc, color, x in skill_cats:
    parts.append(f"""
  <g transform="translate({x},1414)">
    <rect x="0" y="0" width="280" height="72" rx="10" fill="#1e293b" stroke="{color}" stroke-width="1.4"/>
    <text x="14" y="28" fill="{color}" font-size="14" font-weight="700">{title}</text>
    <text x="14" y="50" fill="#94a3b8" font-size="11">{desc}</text>
  </g>""")

# L7 — Commands
parts.append(layer_label(1514, "L7", "入口命令", "#fbbf24"))
parts.append("""
  <g transform="translate(120,1506)">
    <rect x="0" y="0" width="760" height="88" rx="12" fill="#422006" stroke="#f59e0b" stroke-width="1.4"/>
    <text x="20" y="32" fill="#fcd34d" font-size="15" font-weight="700">主流程斜杠</text>
    <text x="20" y="58" fill="#fde68a" font-size="13">/taiyi:new · status · continue · apply · archive</text>
    <text x="20" y="78" fill="#fef3c7" font-size="13">handoff · cancel · commit-trailers</text>
  </g>
  <g transform="translate(920,1506)">
    <rect x="0" y="0" width="760" height="88" rx="12" fill="#2a0f2e" stroke="#ec4899" stroke-width="1.4"/>
    <text x="20" y="32" fill="#f472b6" font-size="15" font-weight="700">OMC / 排查斜杠</text>
    <text x="20" y="58" fill="#fbcfe8" font-size="13">ralph · autopilot · team · ultrawork · agent · stop-mode</text>
    <text x="20" y="78" fill="#fce7f3" font-size="13">remember · modes · step · doctor · audit · verify · health</text>
  </g>
""")

# L8 — Values
parts.append(layer_label(1622, "L8", "核心价值", "#38bdf8"))
for i, (title, desc) in enumerate(VALUES):
    vx = 120 + i * 330
    parts.append(f"""
  <g transform="translate({vx},1614)">
    <rect x="0" y="0" width="300" height="88" rx="12" fill="#1e293b" stroke="#38bdf8" stroke-width="1.4" filter="url(#cardGlow)"/>
    <text x="150" y="36" text-anchor="middle" fill="#38bdf8" font-size="16" font-weight="700">{title}</text>
    <text x="150" y="60" text-anchor="middle" fill="#94a3b8" font-size="12">{desc}</text>
  </g>""")

parts.append("""
  <rect x="120" y="1720" width="1560" height="44" rx="8" fill="#0f172a" stroke="#334155"/>
  <text x="900" y="1748" text-anchor="middle" fill="#64748b" font-size="13">L1 标准 → L2 引擎+工件+门禁 → L3 九阶段 → L4 铁三角 → L5 OMC → L6 Skill → L7 斜杠 · 4× PNG · MIT</text>
  <text x="900" y="1768" text-anchor="middle" fill="#475569" font-size="11">docs/taiyiforge-architecture.svg · TaiyiForge v0.22</text>
""")

parts.append("</svg>")

svg = "\n".join(parts)
OUT.write_text(svg, encoding="utf-8")
print(f"Wrote {OUT} ({len(svg)} bytes, {W}x{H})")


def export_png() -> None:
    font = next((p for p in FONT_CANDIDATES if Path(p).exists()), None)
    cmd = [
        "npx", "--yes", "@resvg/resvg-js-cli",
        "--fit-zoom", str(PNG_ZOOM),
        "--text-rendering", "1",
        "--shape-rendering", "2",
        "--dpi", str(PNG_DPI),
        str(OUT), str(PNG),
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
