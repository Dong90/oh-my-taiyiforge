import fs from "node:fs";
import path from "node:path";

/** 源 prompt 中可写此占位符；安装时替换为 prompts/inc/stage-protocol.md */
export const STAGE_PROTOCOL_PLACEHOLDER = "{{TAIYI_STAGE_PROTOCOL}}";
export const SLASH_CATALOG_PLACEHOLDER = "{{SLASH_CATALOG}}";
export const SUPERPOWERS_INVOKE_PLACEHOLDER = "{{SUPERPOWERS_INVOKE}}";
export const ECC_INVOKE_PLACEHOLDER = "{{ECC_INVOKE}}";
export const THIRD_PARTY_INVOKE_PLACEHOLDER = "{{THIRD_PARTY_INVOKE}}";

const INLINE_PROTOCOL_RE = /\n## Agent 协议（必须遵守）\n[\s\S]*$/;

export function loadSlashCatalog(promptsDir: string): string {
  const file = path.join(promptsDir, "inc", "slash-catalog.generated.md");
  if (!fs.existsSync(file)) {
    throw new Error(`missing slash catalog: ${file} — run npm run generate:docs`);
  }
  return fs.readFileSync(file, "utf8").trimEnd();
}

export function loadStageProtocol(promptsDir: string): string {
  const file = path.join(promptsDir, "inc", "stage-protocol.md");
  if (!fs.existsSync(file)) {
    throw new Error(`missing stage protocol: ${file}`);
  }
  return fs.readFileSync(file, "utf8").trimEnd();
}

export function loadSuperpowersInvoke(promptsDir: string): string {
  const file = path.join(promptsDir, "inc", "superpowers-invoke.md");
  if (!fs.existsSync(file)) {
    return "";
  }
  return fs.readFileSync(file, "utf8").trimEnd();
}

export function loadEccInvoke(promptsDir: string): string {
  const file = path.join(promptsDir, "inc", "ecc-invoke.md");
  if (!fs.existsSync(file)) {
    return "";
  }
  return fs.readFileSync(file, "utf8").trimEnd();
}

export function loadThirdPartyInvoke(promptsDir: string): string {
  const file = path.join(promptsDir, "inc", "third-party-invoke.md");
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf8").trimEnd();
}

/** 将 stage-protocol / superpowers-invoke 注入 taiyi prompt（Cursor commands / Codex prompts 共用） */
export function renderTaiyiPrompt(filename: string, body: string, promptsDir: string): string {
  const protocolPath = path.join(promptsDir, "inc", "stage-protocol.md");
  let out = body;
  if (fs.existsSync(protocolPath)) {
    const protocol = loadStageProtocol(promptsDir);
    if (out.includes(STAGE_PROTOCOL_PLACEHOLDER)) {
      out = out.replaceAll(STAGE_PROTOCOL_PLACEHOLDER, protocol);
    } else if (INLINE_PROTOCOL_RE.test(out)) {
      out = out.replace(INLINE_PROTOCOL_RE, `\n${protocol}`);
    } else if (filename.startsWith("taiyi-") && filename.endsWith(".md") && !out.includes("## Agent 协议")) {
      out = `${out.trimEnd()}\n\n${protocol}\n`;
    }
  }

  const superpowers = loadSuperpowersInvoke(promptsDir);
  if (superpowers && out.includes(SUPERPOWERS_INVOKE_PLACEHOLDER)) {
    out = out.replaceAll(SUPERPOWERS_INVOKE_PLACEHOLDER, superpowers);
  }

  const ecc = loadEccInvoke(promptsDir);
  if (ecc && out.includes(ECC_INVOKE_PLACEHOLDER)) {
    out = out.replaceAll(ECC_INVOKE_PLACEHOLDER, ecc);
  }

  const thirdParty = loadThirdPartyInvoke(promptsDir);
  if (thirdParty && out.includes(THIRD_PARTY_INVOKE_PLACEHOLDER)) {
    out = out.replaceAll(THIRD_PARTY_INVOKE_PLACEHOLDER, thirdParty);
  }

  if (out.includes(SLASH_CATALOG_PLACEHOLDER)) {
    try {
      out = out.replaceAll(SLASH_CATALOG_PLACEHOLDER, loadSlashCatalog(promptsDir));
    } catch (e) {
      // 缺失时保留占位符不替换，写到目标端后用户仍能看到 {{SLASH_CATALOG}} 字样
      // （同时 install-runner 的失败计数不会受影响，因为 placeholder 未替换 = 该 prompt 仍可读）
      process.stderr.write(
        `[taiyi-forge] warn: slash catalog missing for ${filename}: ` +
        `${e instanceof Error ? e.message : String(e)}\n`,
      );
    }
  }

  return out;
}
