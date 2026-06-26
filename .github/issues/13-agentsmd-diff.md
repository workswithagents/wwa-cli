# V4: `wwa agentsmd diff` — show what changed

## Problem

`wwa agentsmd update` is all-or-nothing. Developers need to see what will change before committing updated AGENTS.md to the repo.

## Solution

`wwa agentsmd diff` compares the current AGENTS.md against what would be generated, and shows the diff (like `git diff`).

## Implementation

Add to `src/commands/agentsmd.ts`:

```
wwa agentsmd diff [--project-dir <path>]
```

1. Run the scanner on the current project state
2. Generate the AGENTS.md content in memory (don't write to disk)
3. Read the existing AGENTS.md from disk
4. Compute and print a unified diff between existing and generated
5. Exit 0 if no diff (already current), 1 if there are changes

## Files to modify

- `src/commands/agentsmd.ts` — add `diffAgentsMd()` function, refactor generation to support in-memory output
- `src/cli.ts` — register the command

## Acceptance criteria

- [ ] Shows unified diff of changes that `init`/`update` would make
- [ ] Exit 0 when AGENTS.md is current
- [ ] Exit 1 when AGENTS.md would change
- [ ] Help text documented
- [ ] Existing tests pass

## Labels

enhancement, V4, P1

## Submit

```bash
gh issue create --title "V4: wwa agentsmd diff command" --body-file .github/issues/13-agentsmd-diff.md --label "enhancement,V4,P1"
```
