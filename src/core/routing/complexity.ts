import type { ComplexityAssessment, ComplexityLevel } from "../types.js";

export type ComplexitySignals = {
  touchedModules: number;
  hasUi: boolean;
  testLevels: number;
};

export function assessComplexity(
  signals: ComplexitySignals,
): ComplexityAssessment {
  let score = signals.touchedModules;
  if (signals.hasUi) score += 3;
  score += signals.testLevels;

  let level: ComplexityLevel = "low";
  if (score >= 15) level = "high";
  else if (score >= 8) level = "medium";

  const recommendedSkills = ["taiyi-intel-scan"];
  if (signals.hasUi) recommendedSkills.push("taiyi-restyle");
  if (level !== "low") recommendedSkills.push("taiyi-architect");
  if (level === "medium" || level === "high") recommendedSkills.push("taiyi-health");
  if (level === "high") recommendedSkills.push("taiyi-evolve");

  return { level, score, recommendedSkills };
}
