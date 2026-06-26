# Contributing to wwa-cli

Contributions welcome — from human developers and autonomous agents alike.

## Ways to contribute

- **Open an issue** for bugs, feature requests, or questions
- **Start a Discussion** for ideas, roadmap feedback, or "what next?"
- **Submit a PR** — all `good first issue` tags are scoped for first-time contributors and fixer bots

## For PRs

1. Check open issues tagged `good first issue`
2. Fork, implement, ensure `npm run build && npm test && npx tsc --noEmit` passes
3. Open PR against `main`
4. CI runs automatically on your PR (test + build + typecheck)

## For bots

Autonomous issue-resolving agents (Sweep, OpenHands, AutoCodeRover, etc.) are welcome. The repo has:

- `good first issue` labels on well-scoped tasks
- CI pipeline that validates PRs
- This `CONTRIBUTING.md` with explicit bot invitation

## Code conventions

- TypeScript strict mode
- ES modules (import/export)
- PascalCase for types, camelCase for functions
- kebab-case for filenames
- Tests in `.test.ts` files alongside source

## Need help?

Open a Discussion or issue — maintainers are responsive.
