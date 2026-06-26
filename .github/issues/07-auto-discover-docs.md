# V3: Auto-discover existing project documentation

## Problem

Doc discovery is hardcoded. Many projects have doc files the generator never sees.

## Solution

Scan for: `CONTRIBUTING.md`, `CHANGELOG.md`, `BUGS.md`, `TECH-DEBT.md`, `ARCHITECTURE.md`, `SECURITY.md`, all `.md` files in `docs/`, `api-docs/`, `specs/`, `design/`. If none found, add a placeholder section.

## Files

- `src/commands/agentsmd.ts` — expand `existingDocs` discovery

---

enhancement, V3, P1, good first issue
