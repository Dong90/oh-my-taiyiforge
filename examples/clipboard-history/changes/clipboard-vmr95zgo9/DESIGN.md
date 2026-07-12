# DESIGN
| Option | Summary | Pros | Cons |
|--------|---------|------|------|
| A | SQLite + Commander.js | full-text search, ACID | native dep |
| B | JSON file + yargs | zero deps, simple | slow search |
**Chosen**: A — SQLite supports full-text search and indexing

## Architecture
CLI (Commander.js) => Service Layer => Storage (better-sqlite3)
CLI => Clipboard Adapter => OS native (pbpaste/pbcopy/xclip)

## Reuse
Commander.js standard patterns, better-sqlite3 WAL best practices

## Risks
SQLite file perms => chmod 0600, CLI injection => parameterized queries