import { z } from "zod";

export const DesignSchema = z.object({
  title: z.string().describe("方案设计标题"),
  techStack: z.object({
    selected: z.string().describe("选中的技术栈"),
    reason: z.string().min(1).describe("选择理由"),
  }).optional(),
  existingArchitecture: z.object({
    touchedModules: z.array(z.string()).describe("触碰的既有模块"),
    newModules: z.array(z.string()).describe("新增模块"),
    doNotTouch: z.array(z.string()).optional().describe("禁动清单"),
  }).optional(),
  options: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    cost: z.string().optional(),
  })).min(2).describe("至少两个对比方案"),
  decision: z.object({
    chosen: z.string().describe("选中的方案 ID"),
    reason: z.string().min(1).describe("选择理由"),
    tradeoffs: z.string().optional().describe("取舍说明"),
  }),
  evolutionSuggestions: z.array(z.object({
    type: z.enum(["reusable-abstraction", "tech-decision", "cross-module-contract", "dependency-change"]),
    description: z.string().min(1),
  })).optional().describe("架构沉淀建议，无则空数组"),
});

export type DesignSpec = z.infer<typeof DesignSchema>;
