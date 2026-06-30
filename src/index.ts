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

// ── Registries (added in v1.1, 2026-06) ──
export {
  ProfileRegistry,
  getDefaultRegistry as getDefaultProfileRegistry,
  resetProfileRegistry as resetDefaultProfileRegistry,
  registerProfile,
  resolveProfile,
  getProfile,
  listProfiles,
  loadProfilesFromYaml,
  loadProfilesFromNodeModules,
  validateProfileYaml,
} from "./core/profile-registry.js";
export type { ProfileDefinition, ProfileSource, ProfileError } from "./core/profile-registry.js";

export {
  CodePatternRegistry,
  getDefaultCodePatternRegistry,
  resetDefaultCodePatternRegistry,
  registerCodePattern,
} from "./core/code-pattern-registry.js";
export type { CodePatternDefinition, CodePatternSource } from "./core/code-pattern-registry.js";

export {
  SSOTRuleRegistry,
  getDefaultSSOTRuleRegistry,
  resetDefaultSSOTRuleRegistry,
  registerSSOTRule,
  buildEdgesWithRegistry,
  detectSSOTViolationsWithRegistry,
} from "./core/ssot-rule-registry.js";
export type { SSOTRuleDefinition, SSOTRuleSource } from "./core/ssot-rule-registry.js";

export {
  ExtractorRegistry,
  getDefaultExtractorRegistry,
  resetDefaultExtractorRegistry,
  registerExtractor,
} from "./core/extractor-registry.js";
export type { ExtractorDefinition, ExtractorSource } from "./core/extractor-registry.js";

export {
  RunnerPolicyRegistry,
  getDefaultRunnerPolicyRegistry,
  resetDefaultRunnerPolicyRegistry,
  registerRunnerPolicy,
  selectRunnerForPolicy,
} from "./core/runner-policy-registry.js";
export type {
  RunnerPolicyDefinition,
  RunnerPolicySource,
  RunnerName,
} from "./core/runner-policy-registry.js";
