import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMANDS_YAML = path.join(REPO, "docs/taiyi/commands.yaml");

describe("v30 umbrella coverage", () => {
  const yaml = fs.readFileSync(COMMANDS_YAML, "utf8");

  it("umbrellas documented in commands.yaml", () => {
    expect(yaml).toContain("umbrellas");
    expect(yaml).toContain("/taiyi:skill");
    expect(yaml).toContain("/taiyi:token");
    expect(yaml).toContain("/taiyi:review");
    expect(yaml).toContain("/taiyi:diagram");
    expect(yaml).toContain("/taiyi:test");
  });

  it("canonical-commands documents v30 umbrellas", () => {
    const canon = fs.readFileSync(
      path.join(REPO, "docs/taiyi/canonical-commands.md"),
      "utf8",
    );
    expect(canon).toContain("canonical v30");
    expect(canon).toContain("/taiyi:skill");
    expect(canon).toContain("/taiyi:diagram");
    expect(canon).toContain("/taiyi:token");
    expect(canon).toContain("/taiyi:test");
    expect(canon).toContain("/taiyi:review");
  });
});
