export type PhaseId =
  | "change"
  | "requirement"
  | "design"
  | "ui-design"
  | "task"
  | "dev"
  | "test"
  | "review"
  | "integration";

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

export type ChangeState = {
  slug: string;
  currentPhase: PhaseId;
  completedPhases: PhaseId[];
  createdAt: string;
  updatedAt: string;
};

export type ComplexityLevel = "low" | "medium" | "high";

export type ComplexityAssessment = {
  level: ComplexityLevel;
  score: number;
  recommendedSkills: string[];
};
