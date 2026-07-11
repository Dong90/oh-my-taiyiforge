# CHANGE: Clipboard History Manager

## Motivation
Devs copy-paste 50+ times/day. System clipboard keeps only the last. Need CLI to record history, search, and restore.

## Scope
- In: CLI commands save/list/search/get/clear
- In: SQLite storage, TypeScript + Node.js
- In: macOS (pbpaste/pbcopy) + Linux (xclip)
- Out: GUI, cloud sync, image clipboard

## Success Criteria
- SC-01: clip save persists to SQLite <100ms
- SC-02: clip list shows last 20 entries with timestamps
- SC-03: clip search returns matching entries
- SC-04: unit test coverage >= 80%

## Risks
- macOS/Linux clipboard APIs differ => adapter abstraction
- SQLite concurrent writes => WAL mode + single process