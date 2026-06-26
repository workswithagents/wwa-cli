# V3: npm publish automation via GitHub Action

## Problem

Publishing is manual (`npm version patch && npm run build && npm publish`). Releases get delayed.

## Solution

Create `.github/workflows/publish.yml` that auto-publishes on `v*` tag push. Requires `NPM_TOKEN` secret with bypass-2FA access scoped to `@workswithagents/wwa-cli`.

## Files

- `.github/workflows/publish.yml`

---

enhancement, V3, P2, good first issue
