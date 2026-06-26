# @workswithagents/wwa-cli Roadmap

> **Current:** v0.2.0 — WWA adapter generation for LangGraph, OpenAI Agents SDK, AutoGen, CrewAI, MCP

---

## V3 — Platform & Quality (target: v0.3.0)

**Theme:** Make `wwa agentsmd` a production-ready project documentation generator.

| Priority | Feature | Issue | Effort | Good first issue? |
|----------|---------|-------|--------|-------------------|
| P0 | **Stack-specific templates** — separate AGENTS.md templates per framework (React, SPFx, Next.js, Fastify, Flask, FastAPI, Rust) instead of one template with branches | #3 | 2w | No |
| P0 | **`wwa agentsmd validate` CI integration** — GitHub Action that checks AGENTS.md is current on PR | #4 | 2d | ✅ Yes |
| P1 | **Read `.eslintrc` / `tsconfig.json` / `.prettierrc`** for real config values instead of guessing from dependencies | #5 | 3d | ✅ Yes |
| P1 | **`.wwa-agentsmd.yaml` config file** — project-level overrides for commands, rules, gotchas | #6 | 3d | ✅ Yes |
| P1 | **Auto-discover existing docs** — link `CONTRIBUTING.md`, `BUGS.md`, `CHANGELOG.md`, `docs/*.md` in generated AGENTS.md | #7 | 1d | ✅ Yes |
| P1 | **Detect missing tooling** — warn when no linter/test framework is configured and suggest one | #8 | 1d | ✅ Yes |
| P2 | **Multi-language projects** — support monorepos with both Python and TypeScript | #9 | 3d | No |
| P2 | **`--output` flag** — write AGENTS.md to a custom path (e.g. `docs/AGENTS.md` instead of root) | #10 | 1d | ✅ Yes |
| P2 | **npm publish automation** — GitHub Action that publishes on tag push | #11 | 1d | ✅ Yes |

### V3 Success Criteria

- [ ] `wwa agentsmd init` generates a **meaningful** AGENTS.md for 6+ framework types (React, SPFx, Next.js, Fastify, Flask/Python, Rust)
- [ ] CI validates AGENTS.md is current on every PR
- [ ] User can override any generated section via `.wwa-agentsmd.yaml`
- [ ] Contribution guide published, first external PR merged

---

## V4 — Scale & Ecosystem (target: v0.4.0)

**Theme:** Make agent documentation a standard practice across the ecosystem.

| Priority | Feature | Effort | Notes |
|----------|---------|--------|-------|
| P0 | **`wwa agentsmd verify`** — run the commands listed in AGENTS.md and report which pass/fail | 1w | Turns AGENTS.md into a live contract |
| P1 | **Agent-aware README generation** — generate a `README.md` section about agent tooling from AGENTS.md | 2d | Keeps docs in sync |
| P1 | **`wwa agentsmd diff`** — show what changed between current state and what would be generated | 2d |
| P2 | **Plugin system** — community-contributed templates per framework | 1m |
| P2 | **`wwa agentsmd init --template nextjs-app-router`** — explicit template selection with per-template prompts | 3d | |
| P2 | **`wwa agentsmd migrate`** — convert existing CLAUDE.md / CURSOR.md / .cursorrules into AGENTS.md | 1w | Adoption path for existing projects |
| P3 | **VSCode extension** — inline AGENTS.md validation, "generate" button in project sidebar | 2m | High visibility, lower priority |

### V4 Success Criteria

- [ ] AGENTS.md is a known standard referenced in 10+ open-source projects
- [ ] CI integration is a 1-line GitHub Action include
- [ ] Plugin ecosystem has 3+ community templates
- [ ] Migration path exists for every major agent doc format

---

## V5 — Vision (target: v1.0.0)

**Theme:** The universal agent documentation standard.

- **Agent-readable badge** — `[![Agents.md](https://img.shields.io/badge/agents.md-compliant-blue)]()` for READMEs
- **`wwa agentsmd registry`** — public registry of AGENTS.md files across projects (searchable by stack)
- **Self-healing docs** — CI pipeline that auto-updates AGENTS.md when project config changes and opens a PR
- **Multi-root monorepo support** — one AGENTS.md per package in a monorepo, with a root-level index
- **AI-generated gotchas** — suggest gotchas from git history patterns (reverted commits, common bug patterns)

---

## How to contribute

1. Check the [open issues](https://github.com/workswithagents/wwa-cli/issues) for `good first issue` labels
2. Fork the repo, implement the feature, open a PR
3. Run `npm run build` and `npm test` before submitting
4. Follow the existing code style (TypeScript, strict mode, async/await)

Issues labelled `good first issue` are specifically scoped for first-time contributors.
Autonomous issue-resolving agents (OpenHands, AutoCodeRover, etc.) are welcome.
