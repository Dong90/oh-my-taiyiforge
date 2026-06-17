import { z } from "zod";

export const UiDesignSchema = z.object({
  title: z.string().describe("设计标题"),
  scope: z.string().describe("UI 范围说明"),
  states: z.array(
    z.object({
      name: z.string().describe("状态名称，如 loading/empty/error"),
      description: z.string().describe("状态表现描述"),
    })
  ).optional(),
  accessibility: z.array(z.string()).optional().describe("无障碍检查清单"),
  links: z.array(z.string()).optional().describe("设计稿 / Figma 链接"),
});

export type UiDesignSpec = z.infer<typeof UiDesignSchema>;
