import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

/** Check if prettier is available locally (node_modules or PATH). */
function whichPrettier(): string | null {
  // Check node_modules/.bin/prettier first
  const local = path.join(process.cwd(), "node_modules", ".bin", "prettier");
  try {
    fs.accessSync(local, fs.constants.X_OK);
    return local;
  } catch {
    // not in local node_modules
  }
  // Fall back to PATH via which
  const r = spawnSync("which", ["prettier"], { encoding: "utf8", timeout: 5000 });
  return r.status === 0 ? r.stdout.trim() : null;
}

export type SafeWriteOptions = {
  skipFormat?: boolean;
  formatterCmd?: string;
  skipRedact?: boolean;
  encoding?: BufferEncoding;
};

const SECRET_PATTERNS: RegExp[] = [
  /(?:AKIA[0-9A-Z]{16})/g,
  /(?:sk-[a-zA-Z0-9]{32,})/g,
  /(?:ghp_[a-zA-Z0-9]{36})/g,
  /(?:gho_[a-zA-Z0-9]{36})/g,
  /(?:xox[bprs]-[a-zA-Z0-9-]{24,})/g,
  /(?:-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/g,
];

export function safeWriteFileSync(
  filePath: string,
  content: string,
  options?: SafeWriteOptions,
): void {
  let cleaned = content;

  // CRLF to LF normalization
  cleaned = cleaned.replace(/\r\n/g, "\n");

  // Secrets redaction
  if (!options?.skipRedact) {
    for (const pattern of SECRET_PATTERNS) {
      cleaned = cleaned.replace(pattern, "[REDACTED]");
    }
  }

  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, cleaned, options?.encoding ?? "utf8");

  // Optional formatter pass for markdown files
  if (!options?.skipFormat && filePath.endsWith(".md")) {
    try {
      const formatter = options?.formatterCmd ?? "prettier";
      // Try local prettier first, fall back to npx
      const localPrettier = whichPrettier();
      if (localPrettier) {
        spawnSync(localPrettier, ["--write", "--prose-wrap", "always", filePath], {
          encoding: "utf8",
          timeout: 15000,
          stdio: "ignore",
        });
      } else {
        spawnSync("npx", ["--yes", formatter, "--write", "--prose-wrap", "always", filePath], {
          encoding: "utf8",
          timeout: 15000,
          stdio: "ignore",
        });
      }
    } catch {
      // Formatting is best-effort
    }
  }
}
