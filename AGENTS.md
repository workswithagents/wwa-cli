# AGENTS.md — Project Guide for @workswithagents/wwa-cli

<!-- agentsmd:generated -->

This file is the canonical guide for AI coding agents (Claude Code, Copilot, Cursor, Codex, etc.) working in this repository.

Auto-generated sections are between marker comments. Manual edits outside markers
are preserved on `wwa agentsmd update`.

<!-- agentsmd:end-generated -->

<!-- agentsmd:start:commands -->

## Commands

| Purpose | Command |
|---------|---------|
| Install dependencies | `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Test | `npm run test` |
| Type check | `npx tsc --noEmit` |

**Node.js:** `>= 18`

<!-- agentsmd:end:commands -->

<!-- agentsmd:start:overview -->

## Stack

TypeScript · Vitest · npm

<!-- agentsmd:end:overview -->

<!-- agentsmd:start:layout -->

## Repository Layout

```
src/
docs/
```

<!-- agentsmd:end:layout -->

<!-- agentsmd:start:style -->

## Code Style & Conventions

- **TypeScript strict mode** — enable `strict: true` in tsconfig.json
- **ES modules** — use `import`/`export`, avoid `require()`
- **Naming:** PascalCase for types/components, camelCase for variables/functions, kebab-case for files
- **Types over interfaces** where possible (more composable)

<!-- agentsmd:end:style -->

## Agent Operating Rules

1. **Read this file first.** It supersedes any baked-in conventions.
2. **Run verify checks before reporting done.** Quote real output.
3. **Preserve uncommitted work** — inspect `git status` before editing.
4. **Don't ship by accident.** Never deploy unless explicitly asked.
5. **Keep changes focused.** One concern per PR.
6. **Update this file when project conventions change.**

## Verify Before Done

- [ ] Build: `npm run build` passes
- [ ] Tests: `npm run test` passes
- [ ] Type check: `npx tsc --noEmit` is clean

## Reference Documents

- [docs/frameworks.md](docs/frameworks.md)
- [docs/usage.md](docs/usage.md)

<!-- @@AGENTSMD:CUSTOM_SECTIONS@@ -->

## Known Gotchas

_Add project-specific gotchas here. They persist across `wwa agentsmd update`._

- The `build` script generates `dist/` — never commit this directory
- `npx` requires Node 18+ — this fails silently on older runtimes

## Architecture Decisions

_Document important architectural rules here._
