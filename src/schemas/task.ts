import { z } from "zod";

export const TaskSliceSchema = z.object({
  id: z.string().describe("切片标识，如 S1"),
  label: z.string().describe("切片简述"),
  description: z.string().describe("切片详细描述").optional(),
  test_command: z.string().describe("验证命令，如 npm test -- -t 'login'").optional(),
});

export const TaskSchema = z.object({
  title: z.string().describe("任务标题"),
  slices: z
    .array(TaskSliceSchema)
    .min(1)
    .describe("独立可并行的任务切片"),
});

export type TaskSpec = z.infer<typeof TaskSchema>;
export type TaskSliceSpec = z.infer<typeof TaskSliceSchema>;
