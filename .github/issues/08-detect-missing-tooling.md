# V3: Detect missing tooling and suggest setup

## Problem

When a project has no linter, no test framework, or no type checking, the generator silently produces an AGENTS.md with missing sections. The agent has no guidance and nothing fails.

## Solution

After scanning, if no linter/test/formatter is detected, add a visible section recommending one. Example:

> **No test framework detected.** This project should add one. Recommended: `vitest` for TypeScript projects. See `wwa agentsmd setup --test vitest`.

## Files

- `src/commands/agentsmd.ts` — add missing-tooling detection + recommendation table

---

enhancement, V3, P1, good first issue
