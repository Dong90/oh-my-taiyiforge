/**
 * Type guards for runtime validation in change-graph loader.
 * Validates shape before casting instead of blind `as` assertions.
 */

/** Check if value is a non-null object. */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Check if value is an array of objects. */
export function isObjectArray(v: unknown): v is (Record<string, unknown> | string)[] {
  if (!Array.isArray(v)) return false;
  return v.every(item => typeof item === "string" || (typeof item === "object" && item !== null));
}

/** Safely extract an object array or return undefined. */
export function safeObjectArray(v: unknown): (Record<string, unknown> | string)[] | undefined {
  return isObjectArray(v) ? v : undefined;
}

/** Safely extract a record field or return undefined. */
export function safeRecord(v: unknown): Record<string, unknown> | undefined {
  return isRecord(v) ? v : undefined;
}

/** Safely extract a string field or return undefined. */
export function safeString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
