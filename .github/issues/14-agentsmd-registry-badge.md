# V4: AGENTS.md registry badge for README

## Problem

Projects need a visible signal that they maintain an AGENTS.md. A badge in the README drives adoption — other projects see it and want the same.

## Solution

Shields.io badge: `![Agents.md](https://img.shields.io/badge/agents.md-compliant-blue)`

Add a `wwa agentsmd badge` command that prints markdown for the badge, and add badge-generation as part of `init` / `update`.

## Implementation

```
wwa agentsmd badge
```

Outputs:
```markdown
[![Agents.md](https://img.shields.io/badge/agents.md-compliant-blue)]()
```

Optional `--style` flag for shields.io styles (flat, plastic, flat-square).

In `init`, optionally insert the badge after the first heading in README.md.

## Files to modify

- `src/commands/agentsmd.ts` — add `badgeAgentsMd()` function
- `src/cli.ts` — register the command

## Acceptance criteria

- [ ] `wwa agentsmd badge` prints a markdown badge snippet
- [ ] `wwa agentsmd init` optionally inserts badge into README.md
- [ ] Badge renders correctly on GitHub
- [ ] Help text documented

## Labels

enhancement, V4, P0, good first issue

## Submit

```bash
gh issue create --title "V4: AGENTS.md registry badge" --body-file .github/issues/14-agentsmd-registry-badge.md --label "enhancement,V4,P0,good first issue"
```
