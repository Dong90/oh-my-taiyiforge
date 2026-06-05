/** 用户面：聊天斜杠命令（对齐 /taiyi:status） */
export function tokenSlash(
  sub: "status" | "record" | "scan" | "compress",
  slug?: string,
  tokens?: number,
): string {
  switch (sub) {
    case "status":
      return slug ? `/taiyi:token status ${slug}` : "/taiyi:token status";
    case "record":
      return `/taiyi:token record ${slug ?? "<slug>"} ${tokens ?? "<tokens>"}`;
    case "scan":
      return `/taiyi:token scan ${slug ?? "<slug>"}`;
    case "compress":
      return `/taiyi:token compress ${slug ?? "<slug>"}`;
  }
}

/** Agent 代跑：taiyi-forge 引擎（禁止让用户手打 npx） */
export function tokenForge(
  sub: "status" | "record" | "scan" | "compress",
  slug?: string,
  tokens?: number,
): string {
  const base = "scripts/taiyi-forge.sh token";
  switch (sub) {
    case "status":
      return slug ? `${base} status ${slug}` : `${base} status`;
    case "record":
      return `${base} record ${slug ?? "<slug>"} ${tokens ?? "<tokens>"}`;
    case "scan":
      return `${base} scan ${slug ?? "<slug>"}`;
    case "compress":
      return `${base} compress ${slug ?? "<slug>"}`;
  }
}
