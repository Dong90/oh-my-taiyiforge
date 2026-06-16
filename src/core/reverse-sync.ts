import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import type { ZodSchema } from "zod";
import { getHash, persistAndRender } from "./state-manager.js";
import type { LlmClient } from "./executor-types.js";
import { applyJsonPatches, type JsonPatchOp } from "./json-patch.js";
import Handlebars from "handlebars";

/** 渲染模板但不落盘，返回 Markdown 字符串 */
function renderStageMd(
  stage: string,
  data: Record<string, unknown>,
  templatesDir: string
): string {
  const tplPath = path.join(templatesDir, `${stage}.hbs`);
  const tpl = fsSync.readFileSync(tplPath, "utf-8");
  return Handlebars.compile(tpl)(data);
}

/**
 * 检测 MD 变更是否仅包含 checkbox 勾选变更。
 * 如果是，直接从 MD 提取勾选状态并更新 JSON，返回 true。
 * 如果变更超过 checkbox 范围，返回 false（fall through 到 LLM）。
 */
async function bypassCheckboxToggle(
  stage: string,
  outputDir: string,
  templatesDir: string
): Promise<boolean> {
  const jsonPath = path.join(outputDir, `${stage}.json`);
  const json = JSON.parse(await fs.readFile(jsonPath, "utf-8"));

  const newMd = await fs.readFile(
    path.join(outputDir, `${stage.toUpperCase()}.md`),
    "utf-8"
  );

  // Re-render JSON → old MD to compare
  const oldMd = renderStageMd(stage, json, templatesDir);
  if (oldMd === newMd) return false; // should not happen if hash differs

  // Extract checkbox lines from both: "- [x] **AC-01**: desc" or "- [ ] **AC-01**: desc"
  const re = /^- \[( |x)\] \*\*(AC-\S+)\*\*:(.*)$/gm;
  const parseBoxes = (md: string) => {
    const map: Record<string, boolean> = {};
    let m: RegExpExecArray | null;
    while ((m = re.exec(md)) !== null) {
      map[m[2]] = m[1] === "x";
    }
    return map;
  };

  const oldBoxes = parseBoxes(oldMd);
  const newBoxes = parseBoxes(newMd);

  // Must have checkbox lines to consider this a checkbox-only diff
  if (Object.keys(newBoxes).length === 0) return false;

  // Check if non-checkbox lines changed
  const stripBoxes = (md: string) => md.replace(/^- \[( |x)\] \*\*AC-.*$/gm, "");
  if (stripBoxes(oldMd) !== stripBoxes(newMd)) return false;

  // Check that only checkbox states differ (no new/removed ACs)
  const oldKeys = Object.keys(oldBoxes).sort();
  const newKeys = Object.keys(newBoxes).sort();
  if (oldKeys.join(",") !== newKeys.join(",")) return false;

  // Apply checkbox updates to JSON
  const acList = json.acceptance_criteria as Array<{ id: string; is_checked: boolean }>;
  let changed = false;
  for (const ac of acList) {
    const newState = newBoxes[ac.id];
    if (newState !== undefined && newState !== ac.is_checked) {
      ac.is_checked = newState;
      changed = true;
    }
  }

  if (!changed) return false; // no actual state change

  await persistAndRender(stage, json, outputDir, templatesDir);
  return true;
}

/** 本地旁路同步：仅 hash 检测 + checkbox toggle，无 LLM。供引擎在 complete 前自动调用（同步版本）。 */
export function autoSyncLocalEdits(
  stage: string,
  outputDir: string,
  templatesDir: string
): {
  synced: boolean;
  needsLlm: boolean;
  message: string;
} {
  const mdPath = path.join(outputDir, `${stage.toUpperCase()}.md`);
  const jsonPath = path.join(outputDir, `${stage}.json`);

  if (!fsSync.existsSync(jsonPath) || !fsSync.existsSync(mdPath)) {
    return { synced: false, needsLlm: false, message: "" };
  }

  const currentMd = fsSync.readFileSync(mdPath, "utf-8");
  const currentHash = getHash(currentMd);

  const snapshotDir = path.join(outputDir, ".taiyi", "snapshots");
  const hashPath = path.join(snapshotDir, `${stage}.hash`);
  const savedHash = fsSync.existsSync(hashPath) ? fsSync.readFileSync(hashPath, "utf-8") : "";

  if (currentHash === savedHash) {
    return { synced: false, needsLlm: false, message: "" };
  }

  // Try local bypass (synchronous)
  try {
    const json = JSON.parse(fsSync.readFileSync(jsonPath, "utf-8"));
    const oldMd = renderStageMd(stage, json, templatesDir);
    if (oldMd === currentMd) return { synced: false, needsLlm: false, message: "" };

    const re = /^- \[( |x)\] \*\*(AC-\S+)\*\*:(.*)$/gm;
    const parseBoxes = (md: string) => {
      const map: Record<string, boolean> = {};
      let m: RegExpExecArray | null;
      while ((m = re.exec(md)) !== null) {
        map[m[2]] = m[1] === "x";
      }
      return map;
    };

    const oldBoxes = parseBoxes(oldMd);
    const newBoxes = parseBoxes(currentMd);
    if (Object.keys(newBoxes).length === 0) {
      return { synced: false, needsLlm: true, message: `⚠️ ${stage}.md 已修改，需 AI Agent 调用 reverse-sync` };
    }

    const stripBoxes = (md: string) => md.replace(/^- \[( |x)\] \*\*AC-.*$/gm, "");
    if (stripBoxes(oldMd) !== stripBoxes(currentMd)) {
      return { synced: false, needsLlm: true, message: `⚠️ ${stage}.md 内容变更超出 checkbox，需 LLM reverse-sync` };
    }

    const oldKeys = Object.keys(oldBoxes).sort();
    const newKeys = Object.keys(newBoxes).sort();
    if (oldKeys.join(",") !== newKeys.join(",")) {
      return { synced: false, needsLlm: true, message: `⚠️ ${stage}.md AC 条目有增删，需 LLM reverse-sync` };
    }

    // Apply checkbox updates to JSON
    const acList = json.acceptance_criteria as Array<{ id: string; is_checked: boolean }>;
    let changed = false;
    for (const ac of acList) {
      const newState = newBoxes[ac.id];
      if (newState !== undefined && newState !== ac.is_checked) {
        ac.is_checked = newState;
        changed = true;
      }
    }
    if (!changed) return { synced: false, needsLlm: false, message: "" };

    // Sync write: re-render MD and update hash
    const newMd = renderStageMd(stage, json, templatesDir);
    fsSync.writeFileSync(mdPath, newMd);
    fsSync.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
    fsSync.mkdirSync(snapshotDir, { recursive: true });
    fsSync.writeFileSync(hashPath, getHash(newMd));

    return { synced: true, needsLlm: false, message: "⚡ 本地旁路完成（checkbox toggle）" };
  } catch {
    return { synced: false, needsLlm: true, message: `⚠️ ${stage}.md 同步异常，需 AI Agent 调用 reverse-sync` };
  }
}

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

  // ── Diff Router: 尝试本地旁路 ──
  try {
    const bypassed = await bypassCheckboxToggle(stage, outputDir, templatesDir);
    if (bypassed) {
      console.log(`⚡ 旁路完成（无 LLM 调用）。`);
      return true;
    }
  } catch {
    // Bypass failed, fall through to LLM
  }

  // ── 大段变更：呼叫 LLM ──
  const jsonPath = path.join(outputDir, `${stage}.json`);
  const oldJson = await fs.readFile(jsonPath, "utf-8");

  const syncPrompt = `旧底层 JSON：
${oldJson}

人类修改后的最新 Markdown：
${currentMd}

请分析 Markdown 中的变更。如果仅有少量字段变化，用 JSON Patch 格式输出；如果是大量结构性变化，输出完整 JSON。
JSON Patch 格式示例：[{"op": "replace", "path": "/title", "value": "新标题"}]
完整 JSON 格式：直接输出完整的 ${stage} 对象。`;

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

  const raw = JSON.parse(response.toolCalls[0].arguments);

  let validData: T;
  if (Array.isArray(raw) && raw.length > 0 && raw[0].op) {
    // ── JSON Patch mode ──
    const existing = schema.parse(JSON.parse(oldJson));
    const patched = applyJsonPatches(
      existing as Record<string, unknown>,
      raw as JsonPatchOp[]
    );
    validData = schema.parse(patched);
    console.log(`🔧 JSON Patch 应用完成（${raw.length} 条操作）。`);
  } else {
    // ── Full JSON mode ──
    validData = schema.parse(raw);
  }

  await persistAndRender(stage, validData as Record<string, unknown>, outputDir, templatesDir);

  console.log(`✅ 反向同步完成，底层状态已对齐。`);
  return true;
}
