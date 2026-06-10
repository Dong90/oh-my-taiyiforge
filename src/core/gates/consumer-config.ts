import fs from "node:fs";
import path from "node:path";
import { loadProjectConfig } from "../project-config.js";

type ConsumerPackageTaiyi = {
  taiyi?: {
    deliveryVerifyCmd?: string;
  };
};

/** 消费方交付验证命令：env > .taiyi/config.json > package.json */
export function resolveDeliveryVerifyCmd(workspaceDir: string, env = process.env): string | undefined {
  const fromEnv = env.TAIYI_DELIVERY_VERIFY_CMD?.trim();
  if (fromEnv) return fromEnv;

  const fromConfig = loadProjectConfig(workspaceDir).deliveryVerifyCmd?.trim();
  if (fromConfig) return fromConfig;

  const pkgPath = path.join(workspaceDir, "package.json");
  if (!fs.existsSync(pkgPath)) return undefined;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as ConsumerPackageTaiyi;
    const cmd = pkg.taiyi?.deliveryVerifyCmd?.trim();
    return cmd || undefined;
  } catch {
    return undefined;
  }
}
