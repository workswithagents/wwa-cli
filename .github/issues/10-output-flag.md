# V3: `--output` flag for custom AGENTS.md path

## Problem

AGENTS.md is always written to project root. Some projects prefer `docs/AGENTS.md` or have root already committed.

## Solution

Add `--output <path>` to `wwa agentsmd init` and `update`. Relative paths resolve from project dir.

## Files

- `src/commands/agentsmd.ts` — output path resolution
- `src/cli.ts` — add `--output` option

---

enhancement, V3, P2, good first issue
