# V3: Read tooling config files for precise code style rules

## Problem

The scanner detects ESLint from `package.json` but doesn't read the actual config. Same for `tsconfig.json`, `.prettierrc`, `ruff.toml`. Generated AGENTS.md says "use strict types" instead of the project's actual settings.

## Solution

Probe known config files:

| File | Extract |
|------|---------|
| `tsconfig.json` | `strict`, `target`, `module`, `jsx` |
| `.eslintrc.*` / `eslint.config.*` | Active rule sets |
| `.prettierrc*` | `semi`, `singleQuote`, `trailingComma`, `tabWidth` |
| `ruff.toml` / `pyproject.toml` | Ruff rules enabled |
| `.editorconfig` | indent style, charset |

Output precise rules like: *"Prettier (`semi: true`, `singleQuote: true`, `tabWidth: 2`)"* instead of *"Prettier handles formatting"*

## Files

- `src/commands/agentsmd.ts` — add `readConfigProbes()`, update template

---

enhancement, V3, P1, good first issue
