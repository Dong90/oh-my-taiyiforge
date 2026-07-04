import { resolveDeliveryConfig, resolveDeliveryVerifyFromConfig } from "../delivery-config.js";

/** 消费方交付验证命令：env > config.json > delivery.yaml > package.json */
export function resolveDeliveryVerifyCmd(workspaceDir: string, env = process.env): string | undefined {
  const delivery = resolveDeliveryConfig(workspaceDir);
  return resolveDeliveryVerifyFromConfig(workspaceDir, delivery, env);
}
