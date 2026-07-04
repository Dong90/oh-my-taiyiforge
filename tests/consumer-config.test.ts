import { describe, expect, it, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveDeliveryVerifyCmd } from "../src/core/gates/consumer-config.js";

describe("consumer-config", () => {
  let dir: string;

  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("prefers TAIYI_DELIVERY_VERIFY_CMD over package.json", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-cfg-"));
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ taiyi: { deliveryVerifyCmd: "npm test" } }),
    );
    expect(resolveDeliveryVerifyCmd(dir, { TAIYI_DELIVERY_VERIFY_CMD: "echo env" })).toBe("echo env");
  });

  it("reads taiyi.deliveryVerifyCmd from package.json", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-cfg2-"));
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ taiyi: { deliveryVerifyCmd: "npm test" } }),
    );
    expect(resolveDeliveryVerifyCmd(dir, {})).toBe("npm test");
  });

  it("reads verify command from delivery.yaml when config.json absent", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-yaml-verify-"));
    fs.mkdirSync(path.join(dir, ".taiyi"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".taiyi", "delivery.yaml"),
      "verify:\n  command: npm run verify\n",
    );
    expect(resolveDeliveryVerifyCmd(dir, {})).toBe("npm run verify");
  });
});
