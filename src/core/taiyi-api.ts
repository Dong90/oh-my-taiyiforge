/**
 * TaiyiAPI — Platform-agnostic engine interface.
 *
 * All platform adapters (OpenCode MCP, Claude Code plugin, Codex skill, CLI)
 * invoke engine operations through this module. No adapter should instantiate
 * WorkflowEngine or read .taiyi/ directory directly.
 *
 * Usage:
 *   import { TaiyiAPI } from "../core/taiyi-api.js";
 *   const api = new TaiyiAPI(workspaceDir);
 *   const result = api.init({ title: "Add login" });
 *
 * Architecture:
 *   Claude Code skill ─┐
 *   Codex skill ────────┤
 *   Cursor rule ────────┼──→ TaiyiAPI ──→ WorkflowEngine ──→ .taiyi/
 *   OpenCode MCP ───────┤
 *   CLI ────────────────┘
 *
 * @file src/core/taiyi-api.ts
 */

import { WorkflowEngine } from "./workflow-engine.js";
import type { ChangeProfile, ChangeState, PhaseId, GateInput } from "./types.js";
import { resolveDefaultProfile } from "./project-config.js";
import { resolveTaiyiRoot } from "./paths.js";
import { resolveHbsTemplatesDir } from "./package-root.js";
import { slugifyTitle } from "./active-slug.js";
import { listChanges } from "./list-changes.js";
import type { ListChangesOptions } from "./list-changes.js";

export type InitOptions = {
  slug?: string;
  title: string;
  profile?: ChangeProfile;
  strictDev?: boolean;
  autoHarness?: boolean;
  force?: boolean;
};

export type CompleteOptions = {
  slug: string;
  phaseId: PhaseId;
  approver?: string;
  skipArtifactValidation?: boolean;
};

export class TaiyiAPI {
  public readonly engine: WorkflowEngine;

  constructor(workspaceDir: string) {
    this.engine = new WorkflowEngine(
      resolveTaiyiRoot(workspaceDir),
      resolveHbsTemplatesDir(import.meta.url),
    );
  }

  list(options?: ListChangesOptions) {
    return listChanges(this.engine.taiyiRoot, options);
  }

  init(opts: InitOptions): ChangeState & { seeded: string[] } {
    const profile = opts.profile ?? resolveDefaultProfile(this.engine.taiyiRoot);
    return this.engine.initChange(opts.slug ?? this.slugify(opts.title), {
      title: opts.title,
      profile,
      strictDev: opts.strictDev,
      autoHarness: opts.autoHarness,
      force: opts.force,
    });
  }

  status(slug: string): ChangeState | null {
    return this.engine.getState(slug);
  }

  complete(opts: CompleteOptions) {
    const gates: GateInput = {
      quality: { completeness: true, consistency: true, verifiability: true, traceability: true, engineering_quality: true },
      human: { approved: !!opts.approver, approver: opts.approver ?? "" },
    };
    return this.engine.completePhase(opts.slug, opts.phaseId, gates, {
      skipArtifactValidation: opts.skipArtifactValidation,
    });
  }

  markAuxiliary(slug: string, skillId: string) {
    return this.engine.markAuxiliary(slug, skillId);
  }

  cancel(slug: string) {
    return this.engine.abortChange(slug);
  }

  get taiyiRoot(): string {
    return this.engine.taiyiRoot;
  }

  private slugify(title: string): string {
    return slugifyTitle(title);
  }
}

export function createTaiyiAPI(workspaceDir: string): TaiyiAPI {
  return new TaiyiAPI(workspaceDir);
}
