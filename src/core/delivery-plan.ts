import type { DeliveryConfig } from "./delivery-config.js";
import { renderTemplate, type CommitTemplateContext } from "./delivery-templates.js";

export type DeliveryPlanStep = {
  id: string;
  kind: "shell" | "manual" | "confirm";
  command?: string;
  description: string;
};

export type DeliveryPlan = {
  slug: string;
  phase: string;
  chain: string[];
  steps: DeliveryPlanStep[];
};

function ctx(slug: string, phase: string, summary: string): CommitTemplateContext {
  return { slug, phase, summary };
}

export function planDeliveryChain(
  config: DeliveryConfig,
  slug: string,
  phase: string,
  options?: { summary?: string; ghAvailable?: boolean },
): DeliveryPlan {
  const summary = options?.summary ?? "deliver change slice";
  const templateCtx = ctx(slug, phase, summary);
  const gh = options?.ghAvailable !== false && config.ship.provider === "gh";
  const steps: DeliveryPlanStep[] = [];

  for (const step of config.chain.steps) {
    switch (step) {
      case "commit":
        steps.push({
          id: "commit",
          kind: "shell",
          command: "git add -A && git commit -F -  # 使用 taiyi commit-trailers 建议",
          description: "提交实现并带上配置要求的 trailers",
        });
        break;
      case "verify":
        if (config.verify.command) {
          steps.push({
            id: "verify",
            kind: "shell",
            command: config.verify.command,
            description: "交付前验证命令",
          });
        }
        break;
      case "ship":
        for (const cmd of config.ship.preCommands) {
          steps.push({
            id: `ship-pre-${cmd}`,
            kind: "shell",
            command: cmd,
            description: "ship 前预检",
          });
        }
        if (config.ship.push) {
          steps.push({
            id: "ship-push",
            kind: "shell",
            command: `git push -u ${config.git.defaultRemote} HEAD`,
            description: "推送当前分支",
          });
        }
        if (gh) {
          const title = renderTemplate(config.ship.pr.titleTemplate, templateCtx);
          const base = config.ship.pr.base ?? config.git.baseBranches[0] ?? "main";
          const draftFlag = config.ship.pr.draft ? " --draft" : "";
          const labelFlags = config.ship.pr.labels.map((l) => ` --label "${l}"`).join("");
          steps.push({
            id: "ship-pr",
            kind: config.chain.requireConfirm.includes("ship") ? "confirm" : "shell",
            command: `gh pr create --title "${title}" --base ${base}${draftFlag}${labelFlags}`,
            description: "创建 Pull Request（gh）",
          });
        } else {
          steps.push({
            id: "ship-manual",
            kind: "manual",
            description: "手动开 PR（ship.provider=manual 或无 gh）",
          });
        }
        break;
      case "land":
        if (gh && config.land.provider === "gh") {
          if (config.land.waitCi) {
            steps.push({
              id: "land-wait-ci",
              kind: "shell",
              command: "gh pr checks --watch",
              description: "等待 CI 通过",
            });
          }
          const mergeFlag =
            config.land.merge.method === "squash"
              ? " --squash"
              : config.land.merge.method === "rebase"
                ? " --rebase"
                : " --merge";
          steps.push({
            id: "land-merge",
            kind: config.chain.requireConfirm.includes("land") ? "confirm" : "shell",
            command: `gh pr merge${mergeFlag}${config.land.merge.deleteBranch ? " --delete-branch" : ""}`,
            description: "合并 PR",
          });
        } else {
          steps.push({
            id: "land-manual",
            kind: "manual",
            description: "手动合并 PR / 部署",
          });
        }
        for (const cmd of config.land.postMergeCommands) {
          steps.push({
            id: `land-post-${cmd}`,
            kind: "shell",
            command: cmd,
            description: "合并后命令",
          });
        }
        if (config.land.healthUrl) {
          steps.push({
            id: "land-health",
            kind: "shell",
            command: `curl -sf "${config.land.healthUrl}"`,
            description: "健康检查",
          });
        }
        break;
      case "continue-integration":
        steps.push({
          id: "continue-integration",
          kind: "shell",
          command: `./scripts/taiyi-forge.sh continue ${slug}`,
          description: "推进 integration 阶段",
        });
        break;
      case "archive":
        steps.push({
          id: "archive",
          kind: "shell",
          command: `./scripts/taiyi-forge.sh archive ${slug}`,
          description: "归档变更",
        });
        break;
      default:
        steps.push({
          id: step,
          kind: "manual",
          description: `链步骤 ${step}（未内置命令）`,
        });
    }
  }

  return {
    slug,
    phase,
    chain: [...config.chain.steps],
    steps,
  };
}

export function formatDeliveryPlanPlain(plan: DeliveryPlan): string {
  const lines = [
    `Delivery plan — ${plan.slug} (${plan.phase})`,
    `Chain: ${plan.chain.join(" → ")}`,
    "",
  ];
  plan.steps.forEach((s, i) => {
    lines.push(`${i + 1}. [${s.kind}] ${s.id}: ${s.description}`);
    if (s.command) lines.push(`   $ ${s.command}`);
  });
  return lines.join("\n");
}
