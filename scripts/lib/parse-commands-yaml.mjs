/** @typedef {{ chat: string; meaning?: string; when?: string; engine?: string }} YamlCommand */

/**
 * @param {string} yaml
 * @param {RegExp} sectionRe e.g. /^  auxiliary:\s*$/
 * @returns {YamlCommand[]}
 */
function parseCommandsBlock(yaml, sectionRe) {
  const lines = yaml.split("\n");
  const commands = [];
  let inSection = false;
  let inCommands = false;
  /** @type {YamlCommand | null} */
  let current = null;
  let inMeaning = false;
  /** @type {string[]} */
  let meaningBuf = [];

  const flush = () => {
    if (!current) return;
    if (meaningBuf.length) {
      current.meaning = meaningBuf.join(" ").replace(/\s+/g, " ").trim();
    }
    commands.push(current);
    current = null;
    meaningBuf = [];
    inMeaning = false;
  };

  for (const line of lines) {
    if (line.match(sectionRe)) {
      inSection = true;
      continue;
    }
    if (inSection && line.match(/^  [a-z_]+:\s*$/) && !line.startsWith("    ")) {
      if (!line.match(sectionRe)) {
        flush();
        break;
      }
    }
    if (!inSection) continue;

    if (line.match(/^    commands:\s*$/)) {
      inCommands = true;
      continue;
    }
    if (!inCommands) continue;

    const item = line.match(/^      - chat:\s+"((?:\\.|[^"\\])*)"/);
    if (item) {
      flush();
      current = { chat: item[1].replace(/\\"/g, '"') };
      continue;
    }

    if (!current) continue;

    const when = line.match(/^        when:\s*(.+)$/);
    if (when) {
      current.when = when[1].trim();
      continue;
    }

    const engine = line.match(/^        engine:\s*(.+)$/);
    if (engine) {
      current.engine = engine[1].trim();
      continue;
    }

    if (line.match(/^        meaning:\s*\|\s*$/)) {
      inMeaning = true;
      continue;
    }

    const meaningInline = line.match(/^        meaning:\s*(.+)$/);
    if (meaningInline) {
      current.meaning = meaningInline[1].trim();
      continue;
    }

    if (inMeaning) {
      if (line.match(/^          /)) {
        meaningBuf.push(line.trim());
        continue;
      }
      inMeaning = false;
    }
  }
  flush();
  return commands;
}

/**
 * @param {string} yaml
 * @param {"core"|"auxiliary"} profile
 * @returns {YamlCommand[]}
 */
export function parseProfileCommands(yaml, profile) {
  return parseCommandsBlock(yaml, new RegExp(`^  ${profile}:\\s*$`));
}

/** @param {string} yaml @returns {YamlCommand[]} */
export function parseDeliveryCommands(yaml) {
  const fromChain = parseCommandsBlock(yaml, /^  delivery_chain:\s*$/);
  if (fromChain.length) return fromChain;
  return [];
}

const DELIVERY_CHAIN_SLASH = {
  commit: "/taiyi:commit",
  verify: "/taiyi:verify",
  ship: "/taiyi:ship",
  land: "/taiyi:land",
  "continue-integration": "/taiyi:continue integration",
  archive: "/taiyi:archive",
};

function parseDeliverySectionBlock(yaml) {
  const lines = yaml.split("\n");
  let inBlock = false;
  const blockLines = [];
  for (const line of lines) {
    if (/^  delivery_chain:\s*$/.test(line)) {
      inBlock = true;
      blockLines.length = 0;
      blockLines.push(line);
      continue;
    }
    if (inBlock) {
      if (/^  [a-z0-9_]+:\s*$/.test(line)) break;
      blockLines.push(line);
    }
  }
  return blockLines.join("\n");
}

/** @param {string} yaml @returns {string[]} chain keys from delivery_chain.chain */
export function parseDeliveryChain(yaml) {
  const block = parseDeliverySectionBlock(yaml);
  const m = block.match(/^\s+chain:\s*\[([^\]]+)\]/m);
  if (!m) return [];
  return m[1].split(",").map((s) => s.trim().replace(/['"]/g, ""));
}

/** @param {string[]} chain */
export function formatDeliveryChainText(chain) {
  const parts = chain.map((key) => DELIVERY_CHAIN_SLASH[key] ?? `/taiyi:${key}`);
  if (parts.length <= 4) return parts.join(" → ");
  const lines = [parts.slice(0, 3).join(" → ")];
  if (parts.length > 3) lines.push(`→ ${parts.slice(3).join(" → ")}`);
  return lines.join("\n");
}

/** @param {string} chat */
export function slashVerb(chat) {
  const m = chat.match(/^(\/taiyi:[^\s<[]+)/);
  return m?.[1] ?? chat.split(/\s+/)[0];
}

/** @param {string} meaning */
export function firstSentence(meaning) {
  if (!meaning) return "";
  const s = meaning.split(/。\s/)[0]?.trim() ?? meaning;
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
}

function normalizeCatalogSlash(s) {
  return String(s ?? "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 聊天顶栏 catalog 版本 — 与 commands.yaml canonical_commands.version 对齐 */
export const CANONICAL_CATALOG_VERSION = 30;

const canonicalBlockRe = () => new RegExp(`^  canonical_v${CANONICAL_CATALOG_VERSION}:`);
const canonicalBlockPrefix = () => `  canonical_v${CANONICAL_CATALOG_VERSION}`;
const recommendedKey = () => `recommended_v${CANONICAL_CATALOG_VERSION}`;

/** @param {string} yaml @returns {string[]} slash values from canonical_v*.groups.*.commands */
export function parseCanonicalSlashes(yaml) {
  const slashes = [];
  let inBlock = false;
  const blockStart = canonicalBlockRe();
  const blockPrefix = canonicalBlockPrefix();
  for (const line of yaml.split("\n")) {
    if (line.match(blockStart)) {
      inBlock = true;
      continue;
    }
    if (inBlock && line.match(/^  [a-z_0-9]+:/) && !line.startsWith("    ")) {
      if (!line.startsWith(blockPrefix)) break;
    }
    if (!inBlock) continue;
    const m = line.match(/slash:\s+(.+?)\s*$/);
    if (m) slashes.push(normalizeCatalogSlash(m[1]));
  }
  return slashes;
}

/** @deprecated use parseCanonicalSlashes */
export const parseCanonicalV29Slashes = parseCanonicalSlashes;

/** @param {string} yaml @returns {string[]} legacy_map target slashes in canonical umbrellas */
export function parseCanonicalLegacyMapTargets(yaml) {
  const out = [];
  let inBlock = false;
  let inLegacyMap = false;
  const blockStart = canonicalBlockRe();
  const blockPrefix = canonicalBlockPrefix();
  for (const line of yaml.split("\n")) {
    if (line.match(blockStart)) {
      inBlock = true;
      continue;
    }
    if (inBlock && line.match(/^  [a-z_0-9]+:/) && !line.startsWith("    ")) {
      if (!line.startsWith(blockPrefix)) break;
    }
    if (!inBlock) continue;

    if (line.match(/^\s+legacy_map:\s*$/)) {
      inLegacyMap = true;
      continue;
    }
    if (inLegacyMap) {
      const m = line.match(/^\s{14}[a-z0-9-]+:\s+(\/taiyi:.+?)\s*$/);
      if (m) {
        out.push(m[1].trim());
        continue;
      }
      if (line.match(/^\s{10}- slash:/) || line.match(/^\s{10}[a-z_]+:\s*$/)) {
        inLegacyMap = false;
      }
    }
  }
  return [...new Set(out)];
}

/** @deprecated use parseCanonicalLegacyMapTargets */
export const parseCanonicalV29LegacyMapTargets = parseCanonicalLegacyMapTargets;

/** @param {string} yaml @returns {string[]} token engine_map keys → taiyi-token-<key> prompts */
export function parseCanonicalTokenEngineKeys(yaml) {
  const keys = [];
  let inBlock = false;
  let inEngineMap = false;
  const blockStart = canonicalBlockRe();
  const blockPrefix = canonicalBlockPrefix();
  for (const line of yaml.split("\n")) {
    if (line.match(blockStart)) {
      inBlock = true;
      continue;
    }
    if (inBlock && line.match(/^  [a-z_0-9]+:/) && !line.startsWith("    ")) {
      if (!line.startsWith(blockPrefix)) break;
    }
    if (!inBlock) continue;

    if (line.match(/^\s+engine_map:\s*$/)) {
      inEngineMap = true;
      continue;
    }
    if (inEngineMap) {
      const m = line.match(/^\s{14}([a-z]+):\s+token\s+/);
      if (m) {
        keys.push(m[1]);
        continue;
      }
      if (line.match(/^\s{10}- slash:/) || line.match(/^\s{10}[a-z_]+:\s*$/)) {
        inEngineMap = false;
      }
    }
  }
  return keys;
}

/** @deprecated use parseCanonicalTokenEngineKeys */
export const parseCanonicalV29TokenEngineKeys = parseCanonicalTokenEngineKeys;

/**
 * @param {string} yaml
 * @param {Record<string, string[]>} sections from parseSlashCatalogLists
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function validateCanonicalCatalogSync(yaml, sections) {
  const errors = [];
  const canonical = parseCanonicalSlashes(yaml).map(normalizeCatalogSlash);
  const recKey = recommendedKey();
  const recommended = (sections[recKey] ?? []).map(normalizeCatalogSlash);

  const expected = 21;
  const blockLabel = `canonical_v${CANONICAL_CATALOG_VERSION}`;
  if (canonical.length !== expected) {
    errors.push(`${blockLabel} 应有 ${expected} 条 slash，实际 ${canonical.length}`);
  }
  if (recommended.length !== expected) {
    errors.push(`slash_catalog.${recKey} 应有 ${expected} 条，实际 ${recommended.length}`);
  }
  const a = [...canonical].sort();
  const b = [...recommended].sort();
  if (a.length === b.length) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        errors.push(`catalog 漂移: canonical=${a[i]} vs recommended=${b[i]}`);
        break;
      }
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

/** @deprecated use validateCanonicalCatalogSync */
export const validateV29CatalogSync = validateCanonicalCatalogSync;

export function parseSlashCatalogLists(yaml) {
  const sections = {};
  let inCatalog = false;
  let section = null;
  let inRecommended = false;
  let inLegacy = false;
  for (const line of yaml.split("\n")) {
    if (line.match(/^  slash_catalog:/)) {
      inCatalog = true;
      continue;
    }
    if (inCatalog && line.match(/^  [a-z_0-9]+:/) && !line.startsWith("    ")) {
      if (!line.startsWith("  slash_catalog")) break;
    }
    if (!inCatalog) continue;

    const recMatch = line.match(/^    recommended_v(\d+):\s*$/);
    if (recMatch && Number(recMatch[1]) === CANONICAL_CATALOG_VERSION) {
      inRecommended = true;
      inLegacy = false;
      section = null;
      continue;
    }
    if (line.match(/^    legacy_slash:\s*$/)) {
      inLegacy = true;
      inRecommended = false;
      section = null;
      continue;
    }
    if (line.match(/^    engine_slash:\s*$/)) {
      inRecommended = false;
      inLegacy = false;
      section = "engine_slash";
      if (!sections.engine_slash) sections.engine_slash = [];
      continue;
    }
    if ((inRecommended || inLegacy) && line.match(/^      [a-z_]+:\s*$/)) {
      const subsection = line.trim().replace(":", "");
      section = inLegacy ? `legacy_${subsection}` : subsection;
      if (!sections[section]) sections[section] = [];
      continue;
    }
    if (!inRecommended && !inLegacy && line.match(/^    ([a-z_]+):\s*$/)) {
      section = line.match(/^    ([a-z_]+):\s*$/)?.[1] ?? null;
      if (section && !sections[section]) sections[section] = [];
      continue;
    }
    const item = line.match(/^\s{6,10}- "?(\/taiyi:\S+(?:\s+\S+)*)"?\s*$/);
    if (item && section) {
      if (!sections[section]) sections[section] = [];
      sections[section].push(item[1].trim());
    }
  }
  const recKey = recommendedKey();
  sections[recKey] = [
    ...(sections.main_chain ?? []),
    ...(sections.session ?? []),
    ...(sections.triage ?? []),
    ...(sections.delivery ?? []),
    ...(sections.project ?? []),
    ...(sections.umbrellas ?? []),
  ];
  return sections;
}

export function parseChatSlashes(yaml, blockStart) {
  const out = [];
  let inBlock = false;
  for (const line of yaml.split("\n")) {
    if (line.match(blockStart)) {
      inBlock = true;
      continue;
    }
    if (inBlock && line.match(/^  [a-z_]+:/) && !line.startsWith("    ") && !line.startsWith("      ")) {
      if (!line.match(blockStart)) break;
    }
    if (!inBlock) continue;
    const c = line.match(/chat:\s+"(\/taiyi:[^"]+)"/);
    if (c) {
      out.push(
        c[1]
          .replace(/\s+<[^>]+>/g, "")
          .replace(/\s+\[[^\]]*\]/g, "")
          .replace(/\s+x\d+$/i, "")
          .trim(),
      );
    }
  }
  return out;
}

/**
 * @param {YamlCommand[]} commands
 * @param {string} verb
 */
export function findByVerb(commands, verb) {
  return commands.find((c) => slashVerb(c.chat) === verb);
}

/**
 * @param {YamlCommand[]} commands
 * @param {string} needle substring in chat field
 */
export function findByChatNeedle(commands, needle) {
  return commands.find((c) => c.chat.includes(needle));
}

/** @param {YamlCommand | undefined} cmd */
export function formatEngineCell(cmd) {
  if (!cmd) return "（聊天）";
  if (cmd.engine?.includes("browser-smoke")) return "`browser-smoke`";
  if (cmd.engine?.includes("playwright")) return "（聊天）";
  if (cmd.engine?.includes("提示")) return "（聊天）";
  const shell = cmd.engine?.match(/taiyi-forge\.sh (\S+)/);
  if (shell) return `\`${shell[1]}\``;
  return "（聊天）";
}
