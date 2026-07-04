import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("delivery prompts (native git+gh)", () => {
  const files = ["prompts/taiyi-ship.md", "prompts/taiyi-land.md", "prompts/taiyi-commit.md"];

  for (const rel of files) {
    it(`${rel} references delivery-plan not gstack ship/land`, () => {
      const text = fs.readFileSync(path.join(repoRoot, rel), "utf8");
      expect(text).toContain("delivery-plan");
      expect(text).not.toMatch(/gstack [`']ship[`']/);
      expect(text).not.toMatch(/land-and-deploy/);
    });
  }
});
