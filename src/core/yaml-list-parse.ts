/** 极简 YAML 列表解析（phases / quality-gate 等契约文件，避免额外依赖） */

export function parseYamlListBlocks(
  content: string,
  listKey: string,
): Record<string, string | number | string[]>[] {
  const items: Record<string, string | number | string[]>[] = [];
  let inList = false;
  let current: Record<string, string | number | string[]> | null = null;

  for (const line of content.split("\n")) {
    if (line.match(new RegExp(`^${listKey}:\\s*$`))) {
      inList = true;
      continue;
    }
    if (!inList) continue;
    if (line.match(/^[^\s-]/) && !line.startsWith("#")) break;

    const itemStart = line.match(/^\s+-\s+(\w+):\s*(.+)$/);
    if (itemStart) {
      if (current) items.push(current);
      current = { [itemStart[1]]: unquote(itemStart[2].trim()) };
      continue;
    }

    const field = line.match(/^\s+(\w+):\s*(.+)$/);
    if (field && current) {
      const [, key, raw] = field;
      const v = raw.trim();
      if (v.startsWith("[") && v.endsWith("]")) {
        current[key] = v
          .slice(1, -1)
          .split(",")
          .map((s) => unquote(s.trim()))
          .filter(Boolean);
      } else if (/^\d+$/.test(v)) {
        current[key] = Number(v);
      } else {
        current[key] = unquote(v);
      }
    }
  }
  if (current) items.push(current);
  return items;
}

function unquote(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}
