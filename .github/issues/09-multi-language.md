# V3: Multi-language project support (monorepos)

## Problem

Monorepos with both Python and TypeScript (e.g. MCP servers) confuse the detector — it picks one language and ignores the other.

## Solution

Support `src/` directories with different languages. Detect per-subdirectory: `src/*/pyproject.toml` = Python, `src/*/package.json` = TypeScript. Generate AGENTS.md with sections per language.

## Files

- `src/commands/agentsmd.ts` — per-subdirectory scanning
- `src/detectors/detect.ts` — multi-language detection

---

enhancement, V3, P2
