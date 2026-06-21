import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { WorkflowEngine } from "../core/workflow-engine.js";
import { getLogger } from "../core/logger.js";
import type { ChangeProfile } from "../core/types.js";

export type ImportOptions = {
  source: "git-branch" | "issue" | "pr-description";
  value: string;
  profile?: ChangeProfile;
  title?: string;
};

function sanitizeSlug(input: string): string {
  return input
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/**
 * Import a git branch's commits into a TaiyiForge change.
 *
 * - Reads commits from `git log main..<branch>`
 * - Generates a slug from the branch name
 * - Creates the change directory and CHANGE.md
 * - Writes commit summaries into the scope section of CHANGE.md
 *
 * Returns the change slug.
 */
export async function importFromGitBranch(
  branch: string,
  workspaceDir: string,
  options?: { profile?: ChangeProfile; title?: string },
): Promise<string> {
  const slug = sanitizeSlug(branch);
  const dotTaiyi = path.join(workspaceDir, ".taiyi");
  const changeDir = path.join(dotTaiyi, "changes", slug);

  // If already imported, return existing slug
  if (fs.existsSync(changeDir)) {
    return slug;
  }

  // Read git log
  let commits: string[] = [];
  try {
    const log = execSync(`git log main..${branch} --oneline --no-decorate`, {
      encoding: "utf8",
      cwd: workspaceDir,
    });
    commits = log.trim().split("\n").filter(Boolean);
  } catch {
    getLogger().warn("git log failed — proceeding with empty commits", { branch });
  }

  // Resolve templates directory (project-root/templates/)
  const projectRoot = path.resolve(workspaceDir);
  const potentialTemplates = path.join(projectRoot, "templates");
  const templatesDir = fs.existsSync(potentialTemplates) ? potentialTemplates : undefined;

  // Create the change
  const engine = new WorkflowEngine(dotTaiyi, templatesDir);
  const title = options?.title ?? `${branch} import`;
  engine.initChange(slug, { title, profile: options?.profile ?? "full" });

  // Write commit summaries into CHANGE.md
  const changeMd = path.join(changeDir, "CHANGE.md");
  const scopeLines = commits.map((c) => `  - ${c}`).join("\n");

  if (fs.existsSync(changeMd)) {
    // Template was seeded; replace "- In:" placeholder
    const existing = fs.readFileSync(changeMd, "utf8");
    const populated = existing.replace("- In:", `- In:\n${scopeLines}`);
    fs.writeFileSync(changeMd, populated, "utf8");
  } else {
    // No template available; write CHANGE.md directly
    const changeContent = `# ${title}

## Motivation

Import from branch \`${branch}\`.

## Scope

### In
${scopeLines || "  - (empty — no commits on branch)"}

### Out
  - (none)

## Implementation Notes

Imported via importFromGitBranch.
`;
    fs.writeFileSync(changeMd, changeContent, "utf8");
  }

  return slug;
}
