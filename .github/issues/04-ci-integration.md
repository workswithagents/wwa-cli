# V3: CI integration for `wwa agentsmd validate`

## Problem

`wwa agentsmd validate` exists as a CLI command but there's no CI integration. When a project's build scripts, test framework, or dependencies change, the AGENTS.md drifts silently. The agent reads stale information.

## Solution

Create a GitHub Action that runs `wwa agentsmd validate` on PRs.

## Implementation

Create `.github/workflows/agentsmd-check.yml`:

```yaml
name: Check AGENTS.md
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx @workswithagents/wwa-cli agentsmd validate
```

`validate` already exists in the CLI and returns exit code 0/1. The Action just needs to invoke it.

## Files to create

- `.github/workflows/agentsmd-check.yml`

## Acceptance criteria

- [ ] PR with stale AGENTS.md gets ❌ check
- [ ] PR with current AGENTS.md gets ✅ check
- [ ] Error message says which sections are stale

---

## Labels

enhancement, V3, P0, good first issue

## Submit

```bash
gh issue create --title "V3: CI integration for wwa agentsmd validate" --body-file .github/issues/04-ci-integration.md --label "enhancement,V3,P0,good first issue"
```
