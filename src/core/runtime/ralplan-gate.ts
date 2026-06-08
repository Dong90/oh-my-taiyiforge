import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "../types.js";

export type RalplanGateResult = {
  ok: boolean;
  missing: string[];
  text: string;
};

const PLAN_ARTIFACTS = ["RALPLAN.md", "REQUIREMENT.md", "TASK.md"] as const;

function artifactExists(changeDir: string, name: string): boolean {
  const p = path.join(changeDir, name);
  if (!fs.existsSync(p)) return false;
  try {
    const body = fs.readFileSync(p, "utf8");
    return body.trim().length > 80 && !body.includes("<!-- seed -->");
  } catch {
    return false;
  }
}

/** ralplan-first：dev/test 阶段跑 ralph 前须有计划工件（对标 OMC ralplan-first） */
export function checkRalplanGate(changeDir: string, phase: PhaseId): RalplanGateResult {
  const needsGate = phase === "dev" || phase === "test" || phase === "review";
  if (!needsGate) {
    return { ok: true, missing: [], text: "" };
  }

  const hasRalplan = artifactExists(changeDir, "RALPLAN.md");
  const hasReq = artifactExists(changeDir, "REQUIREMENT.md");
  const hasTask = artifactExists(changeDir, "TASK.md");

  if (hasRalplan || (hasReq && hasTask)) {
    return { ok: true, missing: [], text: "" };
  }

  const missing: string[] = [];
  if (!hasRalplan) {
    if (!hasReq) missing.push("REQUIREMENT.md");
    if (!hasTask) missing.push("TASK.md");
    if (missing.length > 0) missing.unshift("RALPLAN.md（或 REQUIREMENT+TASK）");
  }

  const text = [
    "⚠ ralplan-first 门禁未过",
    "  dev/test/review 跑 /taiyi:ralph 前须有:",
    "    · RALPLAN.md（推荐 /taiyi:ralplan）",
    "    · 或 REQUIREMENT.md + TASK.md 均已填写",
    "",
    `  缺失/未就绪: ${missing.join(", ") || PLAN_ARTIFACTS.join(", ")}`,
    "  → /taiyi:ralplan · /taiyi:plan · 写工件后 /taiyi:continue",
  ].join("\n");

  return { ok: false, missing, text };
}
