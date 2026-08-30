/** v2.0: Shared language-match contract used by all registries.
 *
 *  Semantics (identical across CodePattern / Extractor / Profile / RunnerPolicy
 *  / AgentRole):
 *  - `entryLanguages` undefined OR empty array → universal (always match)
 *  - `entryLanguages` non-empty + `projectLanguage` undefined → no match
 *  - `entryLanguages` non-empty + `projectLanguage` in list → match
 *  - `entryLanguages` non-empty + `projectLanguage` not in list → no match
 *
 *  Why one helper: contract drift across 5 files led to inconsistent behavior
 *  (e.g. some registries treating "undefined languages" as "universal," some
 *  as "explicit unavailable"). Keeping the body here means any future change
 *  affects every registry at once. */
export function matchesLanguage(
  entryLanguages: string[] | undefined,
  projectLanguage: string | undefined,
): boolean {
  if (!entryLanguages || entryLanguages.length === 0) return true;
  if (!projectLanguage) return false;
  return entryLanguages.includes(projectLanguage);
}
