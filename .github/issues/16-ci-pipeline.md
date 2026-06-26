# CI pipeline for wwa-cli (test + build + typecheck)

## Problem

The wwa-cli repo has no CI pipeline. PRs are merged without automated verification. This makes it hard for external contributors (and fixer bots) to know if their changes break anything.

## Solution

Create a GitHub Actions workflow that runs on every PR and push to main:

## Implementation

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on: [pull_request, push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npx tsc --noEmit
```

The repo uses:
- TypeScript (tsc for build)
- Vitest for tests
- npm as package manager

## Files to create

- `.github/workflows/ci.yml`

## Acceptance criteria

- [ ] PRs get a CI check with build + test + typecheck
- [ ] Push to main triggers CI
- [ ] CI fails if build breaks
- [ ] CI fails if tests fail
- [ ] CI fails if typecheck fails
- [ ] CI is green for current main

## Labels

enhancement, V3, P0, good first issue, pipeline

## Submit

```bash
gh issue create --title "CI pipeline for wwa-cli" --body-file .github/issues/16-ci-pipeline.md --label "enhancement,V3,P0,good first issue,pipeline"
```
