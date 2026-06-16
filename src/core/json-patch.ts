export interface JsonPatchOp {
  op: "add" | "remove" | "replace" | "move" | "copy";
  path: string;
  value?: unknown;
  from?: string;
}

/** RFC 6902 JSON Patch: apply operations to a target object, returns mutated copy */
export function applyJsonPatches<T extends Record<string, unknown>>(
  target: T,
  patches: JsonPatchOp[]
): T {
  const obj = JSON.parse(JSON.stringify(target)) as Record<string, unknown>;

  for (const patch of patches) {
    const segments = parsePath(patch.path);

    switch (patch.op) {
      case "replace": {
        setAt(obj, segments, patch.value);
        break;
      }
      case "add": {
        const last = segments[segments.length - 1];
        if (last === "-") {
          const arr = getAt(obj, segments.slice(0, -1)) as unknown[];
          if (!Array.isArray(arr)) throw new Error(`Path not an array: ${patch.path}`);
          arr.push(patch.value);
        } else {
          setAt(obj, segments, patch.value);
        }
        break;
      }
      case "remove": {
        const parent = getAt(
          obj,
          segments.slice(0, -1)
        ) as Record<string, unknown>;
        const key = segments[segments.length - 1];
        if (Array.isArray(parent)) {
          const idx = parseInt(key, 10);
          if (isNaN(idx) || idx < 0 || idx >= parent.length)
            throw new Error(`Invalid array index: ${key} (path: ${patch.path})`);
          parent.splice(idx, 1);
        } else if (parent && typeof parent === "object") {
          delete parent[key];
        }
        break;
      }
      default:
        throw new Error(`Unsupported patch op: ${patch.op}`);
    }
  }

  return obj as T;
}

function parsePath(path: string): string[] {
  if (!path.startsWith("/")) throw new Error(`Invalid JSON Patch path: ${path}`);
  return path === "/" ? [] : path.slice(1).split("/").map(decodePatchSegment);
}

function decodePatchSegment(seg: string): string {
  return seg.replace(/~1/g, "/").replace(/~0/g, "~");
}

function getAt(
  obj: Record<string, unknown>,
  segments: string[]
): unknown {
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined)
      throw new Error(`Cannot traverse into null/undefined at segment: ${seg}`);
    if (Array.isArray(current)) {
      const idx = parseInt(seg, 10);
      if (isNaN(idx) || idx < 0 || idx >= current.length)
        throw new Error(`Array index out of bounds: ${seg}`);
      current = current[idx];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[seg];
    } else {
      throw new Error(`Cannot access property '${seg}' on scalar`);
    }
  }
  return current;
}

function setAt(
  obj: Record<string, unknown>,
  segments: string[],
  value: unknown
): void {
  let current: unknown = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (Array.isArray(current)) {
      const idx = parseInt(seg, 10);
      if (isNaN(idx) || idx < 0 || idx >= current.length)
        throw new Error(`Array index out of bounds: ${seg}`);
      current = current[idx];
    } else if (typeof current === "object" && current !== null) {
      current = (current as Record<string, unknown>)[seg];
    } else {
      throw new Error(`Cannot set on path segment: ${seg}`);
    }
  }
  const last = segments[segments.length - 1];
  if (Array.isArray(current)) {
    const idx = parseInt(last, 10);
    if (isNaN(idx) || idx < 0 || idx >= current.length)
      throw new Error(`Array index out of bounds: ${last}`);
    current[idx] = value;
  } else if (typeof current === "object" && current !== null) {
    (current as Record<string, unknown>)[last] = value;
  } else {
    throw new Error(`Cannot set on path: ${segments.join("/")}`);
  }
}
