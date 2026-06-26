# V3: Stack-specific AGENTS.md templates per framework

## Problem

The current AGENTS.md generator uses one template with language branches. This produces generic output that misses framework-specific conventions, foot-guns, and best practices.

An SPFx project, a Next.js app, a Fastify API, and a Rust CLI all need very different guidance in their AGENTS.md.

## Solution

Create separate templates per framework/stack, stored as Handlebars `.hbs` files in `src/templates/`.

| Template | Rules it includes |
|----------|------------------|
| `react-ts` | Hooks rules, SCSS modules, PascalCase, barrel exports |
| `nextjs` | Server components, App vs Pages router, middleware |
| `spfx` | Service layer pattern, delegated Graph, onAfterDeserialize |
| `fastify` | Plugin architecture, schema validation, hooks |
| `flask` | Blueprint pattern, app factory, migration |
| `fastapi` | Dependency injection, Pydantic models, background tasks |
| `rust` | Clippy rules, workspace layout, unsafe policy |

## Implementation sketch

1. Create `src/templates/` directory
2. Write base template with shared sections (agent rules, verify checklist)
3. Write per-stack templates with framework-specific sections
4. Update `renderAgentsMd()` to select template based on detected framework
5. Command table + layout detection (shared logic) stays in TypeScript

## Files to modify

- `src/commands/agentsmd.ts` — template selection, framework-specific rules
- `src/templates/*.hbs` — new template files (7 files)
- `src/detectors/detect.ts` — may need richer framework detection

## Acceptance criteria

- [ ] `wwa agentsmd init` in an SPFx project generates AGENTS.md with service layer pattern rules
- [ ] Same command in a Next.js project generates server component rules
- [ ] Same command in a Rust project generates clippy + unsafe rules
- [ ] Framework-detection falls back to generic template when unknown

---

## Labels

enhancement, V3, P0

## Submit

```bash
gh issue create --title "V3: Stack-specific AGENTS.md templates per framework" --body-file .github/issues/03-stack-specific-templates.md --label "enhancement,V3,P0"
```
