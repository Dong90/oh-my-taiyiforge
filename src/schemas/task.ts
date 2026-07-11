import { z } from "zod";

const WaveSliceRef = z.object({
  slice_id: z.string().min(2).describe("切片 ID（如 S1）— 至少 2 字符"),
  description: z.string().min(8, "wave slice description ≥ 8 字符").describe("切片在本 Wave 的目标描述"),
});

const Wave = z.object({
  name: z.string().min(1).describe("Wave 名称"),
  slices: z.array(WaveSliceRef),
});

const SliceRisk = z.object({
  slice: z.string(),
  risk: z.string()
    .min(5, "风险描述 ≥ 5 字符，禁止 'r' / '风险' 等占位")
    .describe("该 Slice 可能出错的方式"),
  probability: z.string().describe("概率（low/medium/high）"),
  mitigation: z.string().min(5, "缓解 ≥ 5 字符，不能是 'm' / 'fix'").describe("如何降低风险"),
});

const SliceRollback = z.object({
  slice: z.string(),
  rollback: z.string().min(5, "回滚方式 ≥ 5 字符，不能是 'r' / 'git revert'"),
  time: z.string().describe("预计回滚时间"),
  data_impact: z.string().describe("数据影响"),
});

/**
 * String that rejects single-character placeholders like "x" / "p" / "r".
 * Forces substantive content during JSON authoring.
 */
const SubstantiveString = z.string()
  .refine(
    (s) => s.trim().length >= 3,
    { message: "至少 3 字符（trim 后），禁止 'x' / 'p' / 'r' / 'ok' 单字符占位" }
  )
  .refine(
    (s) => !/^([a-zA-Z]|ok|待定|N\/?A|null|void|TODO|fixme)$/i.test(s.trim()),
    { message: "禁止单字符/通用词占位。写实际描述（≥ 3 字符）" }
  );

export const TaskSchema = z.object({
  title: z.string().min(1).describe("任务拆解标题"),
  total_slices: z.number().int().positive().optional().describe("总切片数"),
  estimated_days: z.string().optional().describe("预估天数"),
  max_parallel: z.number().int().positive().optional().describe("最大并行数"),
  slices: z.array(
    z.object({
      id: z.string().min(2, "切片 ID 至少 2 字符").describe("切片 ID（如 S1/S2）"),
      label: SubstantiveString.optional().describe("切片展示名称（如 '实现 hello'）"),
      risk: SubstantiveString.optional().describe("风险等级（low/medium/high）"),
      description: SubstantiveString.describe("切片描述 — 说明做什么、为什么"),
      files: z.array(z.string()).optional().describe("涉及文件"),
      read_files: z.array(z.string()).optional().describe("需读取的文件"),
      write_files: z.array(z.string()).optional().describe("需写入的文件"),
      test_command: SubstantiveString.optional().describe("验证命令（如 npm test / node --test）"),
      dependencies: z.union([z.string(), z.array(z.string())]).optional().describe("前置依赖"),
      parallelizable: z.boolean().optional().describe("是否可并行"),
      checkpoints: z.array(SubstantiveString).optional().describe("检查点列表 — 每条 ≥ 3 字符"),
      time_estimate: z.string().refine(
        (s) => /^(\d+(?:\.\d+)?)(h|m|min|s|d|w|ms)\b|^(\d+h|\d+m|\d+d)$/i.test(s.trim()) || s.trim().length >= 3,
        { message: "预估时间需符合格式如 '30min'/'2h'/'1d'/'2.5h'，或 ≥ 3 字符" }
      ).describe("预估时间（如 30min / 2h / 1d）"),
      verification: SubstantiveString.optional().describe("验证方式"),
      physical_verification: SubstantiveString.optional().describe("physical anchor: git diff --name-only to confirm write_files modified"),
      covers_frs: z.array(
        z.string().min(1, "FR id must not be empty")
      ).optional().describe("FR ids covered by this slice (maps to requirement.json functional_requirements.items[].id)"),
    })
  ).min(1).describe("至少一个切片"),
  waves: z.array(Wave).optional().describe("执行波次"),
  slice_risks: z.array(SliceRisk).optional().describe("切片风险"),
  slice_rollbacks: z.array(SliceRollback).optional().describe("切片回滚计划"),
  scores: z.object({
    coverage: z.number().min(0).max(10).optional().describe("覆盖率评分 0-10"),
    completeness: z.number().min(0).max(10).optional().describe("完整性评分 0-10"),
    clarity: z.number().min(0).max(10).optional().describe("清晰度评分 0-10"),
  }).optional().describe("质量评分"),
  completeness_score: z.number().min(0).max(10).optional().describe("综合完整度 0-10"),
  evolutionSuggestions: z.array(z.object({
    type: z.enum(["reusable-abstraction", "tech-decision", "cross-module-contract", "dependency-change"]),
    description: z.string().min(1),
  })).optional().describe("架构沉淀建议"),
}).strict();

export type TaskSpec = z.infer<typeof TaskSchema>;
