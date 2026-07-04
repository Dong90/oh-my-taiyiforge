import type { DeliveryConfig } from "./delivery-config.js";

export type CommitTemplateContext = {
  slug: string;
  phase: string;
  type?: string;
  summary?: string;
  subject?: string;
};

export function renderTemplate(template: string, ctx: CommitTemplateContext): string {
  const type = ctx.type ?? "feat";
  const summary = ctx.summary ?? "deliver change slice";
  const subject = ctx.subject ?? `${type}: ${summary}`;
  const vars: Record<string, string> = {
    slug: ctx.slug,
    phase: ctx.phase,
    type,
    summary,
    subject,
  };
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}

export function renderTrailers(
  config: DeliveryConfig,
  ctx: CommitTemplateContext,
): string[] {
  return config.commit.requiredTrailers.map((rule) => {
    const value = renderTemplate(rule.value, ctx);
    return `${rule.key}: ${value}`;
  });
}

export function renderCommitSubject(
  config: DeliveryConfig,
  ctx: CommitTemplateContext,
): string {
  const filled: CommitTemplateContext = {
    ...ctx,
    type: ctx.type ?? config.commit.defaultType,
    summary: ctx.summary ?? config.commit.defaultSummary,
  };
  return renderTemplate(config.commit.subjectTemplate, filled);
}

export function renderCommitMessage(
  config: DeliveryConfig,
  ctx: CommitTemplateContext,
): string {
  const filled: CommitTemplateContext = {
    ...ctx,
    type: ctx.type ?? config.commit.defaultType,
    summary: ctx.summary ?? config.commit.defaultSummary,
  };
  const subject = renderCommitSubject(config, filled);
  const trailers = renderTrailers(config, filled);
  const trailerBlock = trailers.join("\n");

  if (config.commit.bodyTemplate.trim()) {
    const body = renderTemplate(config.commit.bodyTemplate, {
      ...filled,
      subject,
    }).replace("{trailers}", trailerBlock);
    return `${subject}\n\n${body}`.trim();
  }

  if (trailerBlock) {
    return `${subject}\n\n${trailerBlock}`;
  }
  return subject;
}

export function validateCommitSubject(
  config: DeliveryConfig,
  subject: string,
): { ok: boolean; reason?: string } {
  if (subject.length > config.commit.maxSubjectLength) {
    return {
      ok: false,
      reason: `subject 长度 ${subject.length} 超过 maxSubjectLength ${config.commit.maxSubjectLength}`,
    };
  }
  return { ok: true };
}
