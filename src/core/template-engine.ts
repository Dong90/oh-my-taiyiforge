import Handlebars from "handlebars";
import type { PhaseDefinition } from "./types.js";

export type SeedVars = {
  slug: string;
  title?: string;
};

export type TemplateEngineOptions = {
  partials?: Record<string, string>;
  helpers?: Record<string, Handlebars.HelperDelegate>;
};

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor(opts?: TemplateEngineOptions) {
    this.handlebars = Handlebars.create();
    if (opts?.partials) {
      for (const [name, content] of Object.entries(opts.partials)) {
        this.handlebars.registerPartial(name, content);
      }
    }
    if (opts?.helpers) {
      for (const [name, fn] of Object.entries(opts.helpers)) {
        this.handlebars.registerHelper(name, fn);
      }
    }
  }

  /** Render a Handlebars template string with variables. */
  render(template: string, vars: SeedVars & Record<string, unknown>): string {
    const title = vars.title ?? vars.slug.replace(/-/g, " ");
    const compiled = this.handlebars.compile(template, { noEscape: true });
    return compiled({ ...vars, title });
  }

  /** Render a phase artifact template. */
  renderPhaseTemplate(
    raw: string,
    vars: SeedVars,
    phase?: PhaseDefinition,
  ): string {
    const ctx = {
      ...vars,
      title: vars.title ?? vars.slug.replace(/-/g, " "),
      phase: phase ? { id: phase.id, order: phase.order, artifact: phase.artifact } : undefined,
    };
    const compiled = this.handlebars.compile(raw, { noEscape: true });
    return compiled(ctx);
  }
}

/** Default singleton instance. */
let defaultEngine: TemplateEngine | null = null;
export function getTemplateEngine(): TemplateEngine {
  if (!defaultEngine) defaultEngine = new TemplateEngine();
  return defaultEngine;
}

export function setTemplateEngine(engine: TemplateEngine): void {
  defaultEngine = engine;
}

/** Legacy: render a simple template using global singleton engine. */
export function renderTemplate(raw: string, vars: SeedVars & Record<string, unknown>): string {
  return getTemplateEngine().render(raw, vars);
}
