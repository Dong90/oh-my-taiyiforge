/** @typedef {{ chat: string; meaning?: string; when?: string; engine?: string; gstack?: string }} YamlCommand */

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

    const gstack = line.match(/^        gstack:\s*(.+)$/);
    if (gstack) {
      current.gstack = gstack[1].trim();
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
  return parseCommandsBlock(yaml, /^  delivery_gstack:\s*$/);
}

const DELIVERY_CHAIN_SLASH = {
  commit: "/taiyi:commit",
  verify: "/taiyi:verify",
  "gstack-review": "/taiyi:gstack review",
  ship: "/taiyi:ship",
  land: "/taiyi:land",
  release: "/taiyi:release",
  "continue-integration": "/taiyi:continue integration",
  archive: "/taiyi:archive",
};

/** @param {string} yaml @returns {string[]} chain keys from delivery_gstack.chain */
export function parseDeliveryChain(yaml) {
  const m = yaml.match(/^    chain:\s*\[([^\]]+)\]/m);
  if (!m) return [];
  return m[1].split(",").map((s) => s.trim().replace(/['"]/g, ""));
}

/** @param {string[]} chain */
export function formatDeliveryChainText(chain) {
  const parts = chain.map((key) => {
    let slash = DELIVERY_CHAIN_SLASH[key] ?? `/taiyi:${key}`;
    if (key === "gstack-review" || key === "release") slash += "（可选）";
    return slash;
  });
  if (parts.length <= 3) return parts.join(" → ");
  const lines = [parts.slice(0, 3).join(" → ")];
  if (parts.length > 3) lines.push(`→ ${parts.slice(3, 6).join(" → ")}`);
  if (parts.length > 6) lines.push(`→ ${parts.slice(6).join(" → ")}`);
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

/** @param {string} yaml @returns {string[]} slash values from canonical_v28.groups.*.commands */
export function parseCanonicalV28Slashes(yaml) {
  const slashes = [];
  let inBlock = false;
  for (const line of yaml.split("\n")) {
    if (line.match(/^  canonical_v28:/)) {
      inBlock = true;
      continue;
    }
    if (inBlock && line.match(/^  [a-z_0-9]+:/) && !line.startsWith("    ")) {
      if (!line.startsWith("  canonical_v28")) break;
    }
    if (!inBlock) continue;
    const m = line.match(/slash:\s+(.+?)\s*$/);
    if (m) slashes.push(normalizeCatalogSlash(m[1]));
  }
  return slashes;
}

/** @param {string} yaml @returns {string[]} legacy_map target slashes in canonical_v28 umbrellas */
export function parseCanonicalV28LegacyMapTargets(yaml) {
  const out = [];
  let inBlock = false;
  let inLegacyMap = false;
  for (const line of yaml.split("\n")) {
    if (line.match(/^  canonical_v28:/)) {
      inBlock = true;
      continue;
    }
    if (inBlock && line.match(/^  [a-z_0-9]+:/) && !line.startsWith("    ")) {
      if (!line.startsWith("  canonical_v28")) break;
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

/** @param {string} yaml @returns {string[]} token engine_map keys → taiyi-token-<key> prompts */
export function parseCanonicalV28TokenEngineKeys(yaml) {
  const keys = [];
  let inBlock = false;
  let inEngineMap = false;
  for (const line of yaml.split("\n")) {
    if (line.match(/^  canonical_v28:/)) {
      inBlock = true;
      continue;
    }
    if (inBlock && line.match(/^  [a-z_0-9]+:/) && !line.startsWith("    ")) {
      if (!line.startsWith("  canonical_v28")) break;
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

/**
 * @param {string} yaml
 * @param {{ recommended_v28?: string[] }} sections from parseSlashCatalogLists
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function validateV28CatalogSync(yaml, sections) {
  const errors = [];
  const canonical = parseCanonicalV28Slashes(yaml).map(normalizeCatalogSlash);
  const recommended = (sections.recommended_v28 ?? []).map(normalizeCatalogSlash);

  const expected = 29;
  if (canonical.length !== expected) {
    errors.push(`canonical_v28 应有 ${expected} 条 slash，实际 ${canonical.length}`);
  }
  if (recommended.length !== expected) {
    errors.push(`slash_catalog.recommended_v28 应有 ${expected} 条，实际 ${recommended.length}`);
  }
  const a = [...canonical].sort();
  const b = [...recommended].sort();
  if (a.length === b.length) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        errors.push(`v28 漂移: canonical=${a[i]} vs recommended=${b[i]}`);
        break;
      }
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

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

    if (line.match(/^    recommended_v28:\s*$/)) {
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
  sections.recommended_v28 = [
    ...(sections.main_chain ?? []),
    ...(sections.session ?? []),
    ...(sections.triage ?? []),
    ...(sections.delivery ?? []),
    ...(sections.routers ?? []),
    ...(sections.phase_shortcuts ?? []),
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
  if (cmd.gstack) return "（聊天）";
  if (cmd.engine?.includes("playwright")) return "（聊天）";
  if (cmd.engine?.includes("提示")) return "（聊天）";
  const shell = cmd.engine?.match(/taiyi-forge\.sh (\S+)/);
  if (shell) return `\`${shell[1]}\``;
  return "（聊天）";
}
