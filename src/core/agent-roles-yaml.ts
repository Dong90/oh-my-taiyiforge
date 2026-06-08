import type { PhaseId } from "./types.js";
import { AGENT_ROLES, PHASE_AGENT_ROLES, listAgentRoleIds } from "./agent-roles.js";

/** 不在 phase_defaults 中；仅 /taiyi:agent <role> 手动加载 */
export const MANUAL_ONLY_AGENT_ROLES = [
  "code-simplifier",
  "dependency-expert",
  "information-architect",
  "product-analyst",
  "product-manager",
  "quality-strategist",
  "ux-researcher",
  "vision",
] as const;

function yamlQuote(s: string): string {
  if (/[:#\n[\]{}&,*?|>!%@`"']/.test(s) || s.includes("≥")) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return s;
}

function renderRoleBlock(id: string): string[] {
  const role = AGENT_ROLES[id];
  if (!role) return [];
  const phases = role.phases.map((p) => p).join(", ");
  return [
    `  ${id}:`,
    `    label: ${yamlQuote(role.label)}`,
    `    phases: [${phases}]`,
    `    when: ${yamlQuote(role.when)}`,
  ];
}

/** 从 TS 真源生成 docs/taiyi/agent-roles.yaml 内容（load[] 仅在 TS 中维护） */
export function renderAgentRolesYaml(): string {
  const ids = listAgentRoleIds();
  const lines: string[] = [
    "# Taiyi 专 Agent 角色（原生 · 自 OMC agent 池迁移）",
    "# 运行时真源: src/core/agent-roles.ts",
    "# 本文件由 renderAgentRolesYaml() 生成 — 勿手改 roles/phase_defaults/manual_only",
    "",
    "version: 1",
    `description: ${ids.length} 个专 Agent；按阶段默认启用，可通过 /taiyi:agent 单独加载`,
    "",
    "roles:",
  ];

  for (const id of ids) {
    lines.push(...renderRoleBlock(id));
  }

  lines.push("", "phase_defaults:");
  for (const phase of Object.keys(PHASE_AGENT_ROLES) as PhaseId[]) {
    const roleIds = PHASE_AGENT_ROLES[phase].join(", ");
    lines.push(`  ${phase}: [${roleIds}]`);
  }

  lines.push("", "# 不在 phase_defaults 中；仅 /taiyi:agent <role> 手动加载");
  lines.push("manual_only:");
  for (const id of MANUAL_ONLY_AGENT_ROLES) {
    lines.push(`  - ${id}`);
  }

  lines.push("", "parallel:");
  lines.push("  team: /taiyi:team");
  lines.push("  ultrawork: /taiyi:ultrawork");
  lines.push("");

  return lines.join("\n");
}
