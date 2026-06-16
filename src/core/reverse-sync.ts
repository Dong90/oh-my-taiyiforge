import fs from "node:fs/promises";
import path from "node:path";
import type { ZodSchema } from "zod";
import { getHash, persistAndRender } from "./state-manager.js";
import type { LlmClient } from "./executor-types.js";

export async function checkAndSyncHumanEdits<T extends Record<string, unknown>>(
  stage: string,
  schema: ZodSchema<T>,
  outputDir: string,
  templatesDir: string,
  llmClient: LlmClient
): Promise<boolean> {
  const mdPath = path.join(outputDir, `${stage.toUpperCase()}.md`);
  const currentMd = await fs.readFile(mdPath, "utf-8").catch(() => "");
  const currentHash = getHash(currentMd);

  const snapshotDir = path.join(outputDir, ".taiyi", "snapshots");
  const hashPath = path.join(snapshotDir, `${stage}.hash`);
  const savedHash = await fs.readFile(hashPath, "utf-8").catch(() => "");

  if (currentHash === savedHash) return false;

  console.log(`💡 检测到人类修改了 ${mdPath}，触发反向状态同步...`);

  const jsonPath = path.join(outputDir, `${stage}.json`);
  const oldJson = await fs.readFile(jsonPath, "utf-8");

  const syncPrompt = `旧底层 JSON：
${oldJson}

人类修改后的最新 Markdown：
${currentMd}

请分析 Markdown 中的变更，并调用 commit_${stage} 输出合并后的完整 JSON，保持原结构完整。`;

  const response = await llmClient.createChatCompletion(
    [{ role: "user", content: syncPrompt }],
    [
      {
        type: "function",
        function: { name: `commit_${stage}`, parameters: {} },
      },
    ],
    {
      type: "function",
      function: { name: `commit_${stage}` },
    }
  );

  const newJsonStr = response.toolCalls[0].arguments;
  const validData = schema.parse(JSON.parse(newJsonStr));

  // Overwrite JSON and rendered MD
  await persistAndRender(stage, validData as Record<string, unknown>, outputDir, templatesDir);

  console.log(`✅ 反向同步完成，底层状态已对齐。`);
  return true;
}
