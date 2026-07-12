# TASK
## Slices
| S | Desc | Est | Risk |
|---|------|-----|------|
| S1 | Storage layer (SQLite + CRUD) | 2h | low |
| S2 | Clipboard adapter (macOS/Linux) | 1h | low |
| S3 | CLI commands (save/list/search) | 2h | low |

### S1: Storage
**write_files**: src/storage.ts
**Verify**: npm test
### S2: Adapter
**write_files**: src/clipboard.ts
**Verify**: npm test
### S3: CLI
**write_files**: src/cli.ts
**Verify**: npm test

## Scope
In: storage, adapter, CLI | Out: network sync
## Risks
Low: standalone CLI tool