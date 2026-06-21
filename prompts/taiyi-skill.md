---
canonical: v28
umbrella: skill
chat: /taiyi:skill <name>
codex: $taiyi-skill
engine: "加载对应 skill prompt/SKILL.md"
since: v0.28.0
---

# /taiyi:skill — 外部 Skill 路由

统一入口加载外部 Skill：

- `skill gstack <name>` → gstack Skill（review / qa / design-shotgun / autoplan / canary）
- `skill sp <name>`    → Superpowers Skill（brainstorming / tdd / writing-plans / verification）
- `skill explore`      → 头脑风暴（同 brainstorming）
- `skill tdd plan|dev` → TDD 红绿重构
- `skill flow`         → Superpowers 全技能流程

等价于:
  /taiyi:gstack <name>  → /taiyi:skill gstack <name>
  /taiyi:sp <name>      → /taiyi:skill sp <name>
  /taiyi:explore         → /taiyi:skill explore
  /taiyi:tdd plan|dev    → /taiyi:skill tdd plan|dev
  /taiyi:flow            → /taiyi:skill flow
