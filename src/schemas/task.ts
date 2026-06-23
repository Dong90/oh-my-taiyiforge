import { z } from "zod";

const WaveSliceRef = z.object({
  slice_id: z.string(),
  description: z.string(),
});

const Wave = z.object({
  name: z.string(),
  slices: z.array(WaveSliceRef),
});

const SliceRisk = z.object({
  slice: z.string(),
  risk: z.string(),
  probability: z.string(),
  mitigation: z.string(),
});

const SliceRollback = z.object({
  slice: z.string(),
  rollback: z.string(),
  time: z.string(),
  data_impact: z.string(),
});

export const TaskSchema = z.object({
  title: z.string().min(1).describe("任务拆解标题"),
  total_slices: z.number().int().positive().optional().describe("总切片数"),
  estimated_days: z.string().optional().describe("预估天数"),
  max_parallel: z.number().int().positive().optional().describe("最大并行数"),
  slices: z.array(
    z.object({
      id: z.string().min(1).describe("切片 ID"),
      label: z.string().optional().describe("切片展示名称"),
      risk: z.string().optional().describe("风险等级"),
      description: z.string().min(1).describe("切片描述"),
      files: z.array(z.string()).optional().describe("涉及文件"),
      read_files: z.array(z.string()).optional().describe("需读取的文件"),
      write_files: z.array(z.string()).optional().describe("需写入的文件"),
      test_command: z.string().optional().describe("验证命令"),
      dependencies: z.union([z.string(), z.array(z.string())]).optional().describe("前置依赖"),
      parallelizable: z.boolean().optional().describe("是否可并行"),
      checkpoints: z.array(z.string()).optional().describe("检查点"),
      time_estimate: z.string().optional().describe("预估时间"),
      verification: z.string().optional().describe("验证方式"),
      physical_verification: z.string().optional().describe("物理锚点：`git diff --name-only` 确认 write_files 已被修改"),
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
