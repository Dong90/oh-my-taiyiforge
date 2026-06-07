/** Standard .dev-complete evidence — dev 过关须含可验证测试命令与 exitCode: 0 */
export const DEV_COMPLETE_EVIDENCE = `command: npm test
exitCode: 0
dev complete
`;

export function isDevCompleteEvidence(text: string): boolean {
  const trimmed = text.trim();
  const hasMarker =
    trimmed.length >= 8 &&
    (/complete|done|dev/i.test(trimmed) || trimmed.split("\n").some((l) => l.trim().length >= 4));
  const exitOk = /exit(?:Code)?:\s*0\b/i.test(text);
  const cmdOk = /command:\s*\S+/i.test(text);
  return hasMarker && exitOk && cmdOk;
}
