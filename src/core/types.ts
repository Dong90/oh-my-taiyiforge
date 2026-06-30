/** Discriminated-union result type used by all Registry modules.
 *  Prefer over throwing for predictable error handling at boundaries. */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

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

/** Architecture template defines expected code structure (layers, file count, patterns). */
export type ArchTemplateId = "express-3layer" | "fastapi-6layer" | "react-component" | "generic";

/** Constraint: minimum expected items for a codebase dimension. */
export type ArchConstraint = {
  /** Label for diagnostic output (e.g. "分层模块数", "测试文件数", "错误处理模式") */
  label: string;
  /** Minimum count or "must" for boolean checks */
  min: number;
  /** Glob pattern for file count, or path prefix, or pattern to grep */
  glob?: string;
  /** Alternative: grep for a pattern (e.g. error handling middleware pattern) */
  grep?: string;
  /** File extension filter when counting */
  ext?: string | string[];
};

/** Full architecture template definition. */
export type ArchitectureTemplate = {
  id: ArchTemplateId;
  label: string;
  /** Minimum total source files (excl. config, tests, node_modules) */
  minSourceFiles: number;
  /** Minimum total test files */
  minTestFiles: number;
  /** Expected directory structure prefixes */
  expectedDirs: string[];
  /** Expected patterns (checked via grep) */
  expectedPatterns: { label: string; grep: string; path?: string }[];
  /** Context guide injected into dev-phase agent prompts (TDD mode).
   *  Plain text (no markdown headings) describing architecture conventions,
   *  directory structure, code patterns, and production readiness expectations.
   *  Agents read this BEFORE generating code. */
  contextGuide?: string;
  /** Additional constraints for the delivery-gate production-readiness check */
  productionReadiness?: {
    /** Check that health endpoint returns 200 */
    healthEndpoint?: boolean;
    /** Check package.json contains these scripts */
    requiredScripts?: string[];
    /** Check CORS config exists (backend projects) */
    corsCheck?: boolean;
  };
};

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
