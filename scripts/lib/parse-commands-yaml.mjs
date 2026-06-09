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

export function parseSlashCatalogLists(yaml) {
  const sections = {};
  let inCatalog = false;
  let section = null;
  for (const line of yaml.split("\n")) {
    if (line.match(/^  slash_catalog:/)) {
      inCatalog = true;
      continue;
    }
    if (inCatalog && line.match(/^  [a-z_]+:/) && !line.startsWith("    ")) {
      if (!line.startsWith("  slash_catalog")) break;
    }
    if (!inCatalog) continue;
    const sec = line.match(/^    ([a-z_]+):\s*$/);
    if (sec) {
      section = sec[1];
      if (!sections[section]) sections[section] = [];
      continue;
    }
    const item = line.match(/^      - (\/taiyi:[^\s#]+(?:\s[^\s#]+)?)\s*$/);
    if (item && section) sections[section].push(item[1].trim());
  }
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
