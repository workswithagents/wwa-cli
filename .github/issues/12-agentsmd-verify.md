# V4: `wwa agentsmd verify` — run the commands listed in AGENTS.md

## Problem

AGENTS.md lists build, test, and type-check commands — but nothing proves those commands actually work. An agent reads "✓ npm run build" from AGENTS.md, runs it, and it fails because the doc is stale.

## Solution

`wwa agentsmd verify` extracts every command from AGENTS.md, runs them in order, and reports pass/fail per command with exit codes and output.

## Implementation

Add to `src/commands/agentsmd.ts`:

```
wwa agentsmd verify [--project-dir <path>]
```

1. Parse AGENTS.md for the `## Commands` table (between `<!-- agentsmd:start:commands -->` markers)
2. Extract all commands from the second column
3. Execute each via `child_process.exec` sequentially
4. Report: `✅ build: npm run build (0.4s)` / `❌ test: npm run test (2.1s) exit code 1`
5. Exit code 0 if all pass, 1 if any fail

## Files to modify

- `src/commands/agentsmd.ts` — add `verifyAgentsMd()` function
- `src/cli.ts` — register `wwa agentsmd verify` subcommand

## Acceptance criteria

- [ ] `wwa agentsmd verify` finds and runs commands from AGENTS.md
- [ ] Reports ✅ per passing command with timing
- [ ] Reports ❌ per failing command with exit code
- [ ] Exits 0 on all pass, 1 on any failure
- [ ] Help text documents the command
- [ ] Existing tests pass

## Labels

enhancement, V4, P0

## Submit

```bash
gh issue create --title "V4: wwa agentsmd verify command" --body-file .github/issues/12-agentsmd-verify.md --label "enhancement,V4,P0"
```
