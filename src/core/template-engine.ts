import Handlebars from "handlebars";
import type { PhaseDefinition } from "./types.js";

export type ModulePattern =
  | "Adapter" | "Strategy" | "Service" | "Controller"
  | "Middleware" | "Model" | "Config" | "Util"
  | "Health" | "Main" | "Metrics" | "ExceptionHandler" | "ResponseTimeMiddleware" | "ErrorHandlerMiddleware";

/** Per-module code generation spec. */
export type ModuleManifestEntry = {
  id: string;
  file: string;
  pattern: ModulePattern;
  class_name: string;
  extends?: string;
  depends_on: string[];
  methods: { name: string; return_type: string; is_abstract: boolean }[];
  prompt_style?: "basic" | "advanced";
  constraints: string[];
  source_quote?: string;
  confidence_score?: number;
  extension_metadata?: Record<string, string>;
};

/** Code quality contract for DEV phase. */
export type CodeStyleContract = {
  type_hints: boolean;
  docstrings: boolean;
  error_handling: "basic" | "defensive";
  logging_style: "json" | "simple";
  request_tracing: boolean;
  prompt_engineering: "basic" | "advanced";
};

export type SeedVars = {
  slug: string;
  title?: string;
  /** 一句话变更描述（渲染到 CHANGE.md 的「一句话」行和 Problem Statement） */
  motivation?: string;
  /** 较长的变更背景描述（作为 motivation 的第二 fallback） */
  description?: string;
  /** 架构设计模式列表，用于 DESIGN 阶段生成 module_manifest */
  architecture_patterns?: string[];
  /** 技术栈偏好 */
  tech_stack_preferences?: {
    language?: string;
    framework?: string;
    orm?: string;
    testing?: string;
  };
  /** 代码质量契约，控制 DEV 阶段生成质量 */
  code_style?: CodeStyleContract;
  /** 模块清单，用于 DESIGN→TASK→DEV 三阶段代码生成链 */
  module_manifest?: ModuleManifestEntry[];
};

export type TemplateEngineOptions = {
  partials?: Record<string, string>;
  helpers?: Record<string, Handlebars.HelperDelegate>;
};

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor(opts?: TemplateEngineOptions) {
    this.handlebars = Handlebars.create();
    // 内置对比 helper，供模板 {{#if (eq a b)}} 使用
    this.handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
    this.handlebars.registerHelper("neq", (a: unknown, b: unknown) => a !== b);
    // Logical or for subexpressions: {{#if (or a b c)}}
    this.handlebars.registerHelper("or", (...args: unknown[]) =>
      args.slice(0, -1).some((v) => Boolean(v)),
    );
    // Empty check for strings/arrays: {{#if (nonempty a)}}
    this.handlebars.registerHelper("nonempty", (v: unknown) => {
      if (v == null) return false;
      if (typeof v === "string") return v.trim().length > 0;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    });
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
  render<Extra extends Record<string, unknown> = Record<string, unknown>>(
    template: string,
    vars: SeedVars & Extra,
  ): string {
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
