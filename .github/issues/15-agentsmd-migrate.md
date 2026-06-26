# V4: `wwa agentsmd migrate` — convert existing CLAUDE.md / .cursorrules

## Problem

Thousands of projects already have CLAUDE.md, .cursorrules, or CURSOR.md. Switching to AGENTS.md as the canonical source means either:
- Duplicating content across files (drift risk)
- Deleting existing files and losing the investment

## Solution

`wwa agentsmd migrate` reads existing agent documentation files, extracts their content, and merges it into a generated AGENTS.md.

## Implementation

```
wwa agentsmd migrate [--project-dir <path>]
```

1. Scan for existing files: CLAUDE.md, CURSOR.md, .cursorrules, GEMINI.md
2. Extract custom instructions/sections from each
3. Generate fresh AGENTS.md sections via the scanner
4. Merge custom content into the `<!-- @@AGENTSMD:CUSTOM_SECTIONS@@ -->` area
5. Optionally add a comment noting the source of each migrated section
6. Leave existing source files in place (don't delete them)

## Files to modify

- `src/commands/agentsmd.ts` — add `migrateAgentsMd()` function
- `src/cli.ts` — register the command

## Acceptance criteria

- [ ] Detects CLAUDE.md, .cursorrules, CURSOR.md, GEMINI.md
- [ ] Extracts instructions from each
- [ ] Merges into AGENTS.md without losing auto-generated sections
- [ ] Leaves source files intact
- [ ] Help text documented

## Labels

enhancement, V4, P2

## Submit

```bash
gh issue create --title "V4: wwa agentsmd migrate from CLAUDE.md/cursorrules" --body-file .github/issues/15-agentsmd-migrate.md --label "enhancement,V4,P2"
```
