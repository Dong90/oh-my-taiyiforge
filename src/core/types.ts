/** Base built-in phase IDs. Use PhaseId for autocomplete + custom extension. */
export type PhaseIdBase =
  | "change"
  | "requirement"
  | "design"
  | "ui-design"
  | "task"
  | "dev"
  | "test"
  | "review"
  | "integration";

/** PhaseId — autocomplete for built-in phases, accepts any string for custom phases. */
export type PhaseId = PhaseIdBase | (string & {});

export type PhaseDefinition = {
  id: PhaseId;
  order: number;
  skill: string;
  artifact: string;
  kind: "markdown" | "code";
  requires: PhaseId[];
};

export type QualityScores = {
  completeness: boolean;
  consistency: boolean;
  verifiability: boolean;
  traceability: boolean;
  engineering_quality: boolean;
};

export type HumanApproval = {
  approved: boolean;
  approver: string;
};

export type GateInput = {
  quality: QualityScores;
  human: HumanApproval;
};

export type ChangeProfile = "full" | "api" | "ui" | "lite" | "spike" | "micro" | "nano";

export type WorkflowStatus = "active" | "completed" | "aborted";

export type ChangeState = {
  slug: string;
  currentPhase: PhaseId;
  completedPhases: PhaseId[];
  /** 九阶段全部完成后为 completed（currentPhase 保留末阶段便于追溯） */
  workflowStatus?: WorkflowStatus;
  profile: ChangeProfile;
  skippedPhases: PhaseId[];
  strictDev: boolean;
  /** 全自动编排：铁三角 + 辅助 Skill 为 complete 前置条件 */
  autoHarness?: boolean;
  complexity?: ComplexityAssessment;
  auxiliaryCompleted: string[];
  createdAt: string;
  updatedAt: string;
  /** Optimistic concurrency version — incremented on every writeState call to detect stale writes */
  version?: number;
};

export type ComplexityLevel = "low" | "medium" | "high";

export type ComplexityAssessment = {
  level: ComplexityLevel;
  score: number;
  recommendedSkills: string[];
  recommendedProfile?: ChangeProfile;
};
