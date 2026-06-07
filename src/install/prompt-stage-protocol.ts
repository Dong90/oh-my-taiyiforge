import fs from "node:fs";
import path from "node:path";

/** 源 prompt 中可写此占位符；安装时替换为 prompts/inc/stage-protocol.md */
export const STAGE_PROTOCOL_PLACEHOLDER = "{{TAIYI_STAGE_PROTOCOL}}";

const INLINE_PROTOCOL_RE = /\n## Agent 协议（必须遵守）\n[\s\S]*$/;

export function loadStageProtocol(promptsDir: string): string {
  const file = path.join(promptsDir, "inc", "stage-protocol.md");
  if (!fs.existsSync(file)) {
    throw new Error(`missing stage protocol: ${file}`);
  }
  return fs.readFileSync(file, "utf8").trimEnd();
}

/** 将 stage-protocol 注入 taiyi prompt（Cursor commands / Codex prompts 共用） */
export function renderTaiyiPrompt(filename: string, body: string, promptsDir: string): string {
  const protocolPath = path.join(promptsDir, "inc", "stage-protocol.md");
  if (!fs.existsSync(protocolPath)) {
    return body;
  }
  const protocol = loadStageProtocol(promptsDir);

  if (body.includes(STAGE_PROTOCOL_PLACEHOLDER)) {
    return body.replaceAll(STAGE_PROTOCOL_PLACEHOLDER, protocol);
  }
  if (INLINE_PROTOCOL_RE.test(body)) {
    return body.replace(INLINE_PROTOCOL_RE, `\n${protocol}`);
  }
  if (filename.startsWith("taiyi-") && filename.endsWith(".md") && !body.includes("## Agent 协议")) {
    return `${body.trimEnd()}\n\n${protocol}\n`;
  }
  return body;
}
