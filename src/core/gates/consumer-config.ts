import fs from "node:fs";
import path from "node:path";

type ConsumerPackageTaiyi = {
  taiyi?: {
    deliveryVerifyCmd?: string;
  };
};

/** 消费方 package.json 可选字段 `taiyi.deliveryVerifyCmd`（低于 env 优先级） */
export function resolveDeliveryVerifyCmd(workspaceDir: string, env = process.env): string | undefined {
  const fromEnv = env.TAIYI_DELIVERY_VERIFY_CMD?.trim();
  if (fromEnv) return fromEnv;

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
