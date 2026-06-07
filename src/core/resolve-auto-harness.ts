/** Resolve --auto / --no-auto / TAIYI_AUTO_HARNESS for init vs new. */
export function resolveAutoHarness(cliArgs: string[], defaultWhenUnset: boolean): boolean {
  if (cliArgs.includes("--no-auto")) return false;
  if (cliArgs.includes("--auto")) return true;
  const env = process.env.TAIYI_AUTO_HARNESS;
  if (env === "1" || env === "true") return true;
  if (env === "0" || env === "false") return false;
  return defaultWhenUnset;
}
