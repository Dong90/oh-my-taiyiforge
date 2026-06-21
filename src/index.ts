/**
 * TaiyiForge 公开 API
 * @module taiyi-forge
 */

// Core types
export type {
  PhaseId,
  PhaseIdBase,
  PhaseDefinition,
  ChangeState,
  ChangeProfile,
  WorkflowStatus,
  GateInput,
  QualityScores,
  HumanApproval,
  ComplexityLevel,
  ComplexityAssessment,
} from "./core/types.js";

// Workflow engine
export { WorkflowEngine } from "./core/workflow-engine.js";
export type { InitChangeOptions, StateLookup } from "./core/workflow-engine.js";

// Phase registry
export {
  listPhases,
  tryGetPhase,
  getPhase,
  getPhaseOrder,
  getNextPhase,
  canEnterPhase,
  registerCustomPhase,
  registerCustomPhases,
  loadCustomPhasesFromConfig,
  resetPhases,
} from "./core/phase-registry.js";

// Project config
export { loadProjectConfig, projectConfigPath } from "./core/project-config.js";

// Templates
export { TemplateEngine, getTemplateEngine, renderTemplate } from "./core/template-engine.js";
export { seedChangeTemplates, seedPhaseTemplate } from "./core/template-seed.js";
export type { SeedVars } from "./core/template-engine.js";

// Logger
export { TaiyiLogger, getLogger, setLogger, resolveLogLevel } from "./core/logger.js";
export type { LogLevel } from "./core/logger.js";

// Change lock
export { ChangeLock } from "./core/change-lock.js";

// Harness runner
export { buildHarnessPlan, enforceAutoHarnessBeforeComplete } from "./core/harness-runner.js";
export type { HarnessPlan, HarnessStep } from "./core/harness-runner.js";

// Slug utilities
export { assertValidSlug, validateSlug } from "./core/slug.js";

// Archive
export { resolveChangeDir } from "./core/taiyi-archive.js";
