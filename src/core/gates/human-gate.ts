import type { HumanApproval } from "../types.js";

export function evaluateHumanGate(approval: HumanApproval): {
  passed: boolean;
  reason?: string;
} {
  if (!approval.approved) {
    return { passed: false, reason: "Human approval required" };
  }
  if (!approval.approver?.trim()) {
    return { passed: false, reason: "Approver identity required" };
  }
  return { passed: true };
}
