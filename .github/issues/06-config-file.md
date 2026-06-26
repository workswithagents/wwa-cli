# V3: `.wwa-agentsmd.yaml` config file for project overrides

## Problem

No structured way to override detected values (build commands, rules, gotchas) that survives `wwa agentsmd update`.

## Solution

Support `.wwa-agentsmd.yaml` at project root:

```yaml
commands:
  build: "npm run build:prod"
  test: "npm run test:coverage"
  ignore: ["clean", "ship"]
rules:
  - "Never import from 'src/legacy/'"
gotchas:
  - "Hot reload breaks on .graphql changes"
docs:
  - "CONTRIBUTING.md"
```

Config values merge over detected values and embed into generated AGENTS.md.

## Files

- `src/commands/agentsmd.ts` — config reader, merge logic

---

enhancement, V3, P1, good first issue
