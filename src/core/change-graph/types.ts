import type { PhaseId } from "../types.js";

/** A node in the change graph — one logical entity from any phase. */
export type GraphNode = {
  id: string;
  phase: PhaseId;
  kind: NodeKind;
  label: string;
  /** Original JSON data from the phase fixture / .json file. */
  data: Record<string, unknown>;
};

export type NodeKind =
  | "risk"
  | "nfr"
  | "threat"
  | "test_case"
  | "rollback"
  | "deployment_step"
  | "monitoring_metric"
  | "acceptance_criterion"
  | "design_decision"
  | "slice"
  | "unknown";

/** A directed edge between two nodes in the change graph. */
export type Edge = {
  from: string;
  to: string;
  kind: EdgeKind;
};

export type EdgeKind =
  | "derives_from"   // NFR 派生自 risk
  | "mitigates"      // threat 缓解 risk
  | "tests"          // test_case 验证 NFR / requirement
  | "duplicates"     // 同字段跨阶段重复（SSOT violation）
  | "implements"     // slice implements design_decision
  | "rolls_back"     // rollback plan for deployment
  | "monitors";       // monitoring_metric monitors requirement

/** Filtered subgraph returned by getCrossCutting. */
export type Subgraph = {
  nodes: GraphNode[];
  edges: Edge[];
};

/** A detected SSOT violation — same data field defined differently across phases. */
export type SSOTViolation = {
  field: string;
  nodes: GraphNode[];
  description: string;
  severity: "low" | "medium" | "high";
};

export type ConsistencyReport = {
  ok: boolean;
  violations: SSOTViolation[];
  summary: string;
};

/** A rule that defines how edges are built between nodes across phases. */
export type EdgeRule = {
  fromPhases: PhaseId[];
  fromKind: NodeKind;
  toPhases: PhaseId[];
  toKind: NodeKind;
  edgeKind: EdgeKind;
  /** Optional: field name(s) that should match between source and target for stronger linking. */
  matchFields?: string[];

  /** Enable SSOT violation detection for this edge rule. Default: true for duplicates, false otherwise. */
  violationEnabled?: boolean;
  /** Label comparison strictness for violation detection. Default: 'substring'. */
  matchStrategy?: MatchStrategy;
};

export type MatchStrategy = "exact" | "substring" | "word-overlap-2" | "word-overlap-1";

/** Serializable graph state (for snapshot / serialization). */
export type GraphSnapshot = {
  nodes: Array<{
    id: string;
    phase: PhaseId;
    kind: NodeKind;
    label: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    kind: EdgeKind;
  }>;
};
