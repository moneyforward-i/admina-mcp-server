# Security Triage — admina-mcp-server — 2026-05-15

## Summary

- **Secret scanning:** 5 open. Real leaks: 0. Historical leaks: 0. Real PII: 0. False positives (placeholders in docs / test fixtures): 5. Needs review: 0.
- **Code scanning:** 2 open. Live bugs: 2 (both `actions/missing-workflow-permissions`). Low-risk: 0. False positives: 0.

All five secret alerts are GitHub's `pii_email_address` detector matching **obvious placeholder addresses** (`someone@gmail.com`, `foo@gmail.com`, and three `@email.com` test-domain values) — none correspond to real MoneyForward employees, customers, or third-party individuals. Per the skill's classification table, placeholders in documentation strings and test fixtures are FALSE POSITIVE.

Both code-scanning alerts are the same rule (`actions/missing-workflow-permissions`) firing on the two workflows in `.github/workflows/`. Trivial fix: add an explicit least-privilege `permissions: contents: read` top-level block to each. `release.yml` publishes to npm via `NODE_AUTH_TOKEN` (not via `GITHUB_TOKEN`), so it does **not** need `contents: write` or `id-token: write` for that step — `contents: read` is sufficient for `actions/checkout`.

No NEEDS REVIEW rows. No real MFI internal addresses (`@moneyforward.co.jp`, `@i.moneyforward.com`, `@iggre.net`) present in any of the flagged data.

## Secret Scanning

| # | Type | Secret (truncated) | File or Location | In current code? | Classification | Action | Dismiss reason |
|---|------|--------------------|------------------|------------------|----------------|--------|----------------|
| 1 | pii_email_address | `someone@gmail.com` | commit `f832c71` `src/index.ts:69`, commit `32bd1b4` `src/server.ts:123` (now `src/index.ts:100,102` on `main`) | Yes — in `src/index.ts` tool-description docstring as a usage example | FALSE POSITIVE (placeholder in docs) | Optionally swap to `user@example.com` (reserved RFC 2606 domain) to silence detector; dismiss `false_positive` either way | `false_positive` |
| 2 | pii_email_address | `primay@email.com` | commit `bfb0423` `src/test/remote/fixtures/e2e-tools-full.json:5205` & `src/generated/tools.json:5205` | No — fixture/generated files not on `main` (live on a feature branch) | FALSE POSITIVE (placeholder in e2e test fixture / generated JSON) | Dismiss | `false_positive` |
| 3 | pii_email_address | `secondary+1@email.com` | commit `bfb0423` `src/test/remote/fixtures/e2e-tools-full.json:5211` & `src/generated/tools.json:5211` | No — same as above | FALSE POSITIVE (placeholder in e2e test fixture) | Dismiss | `false_positive` |
| 4 | pii_email_address | `foo@gmail.com` | commit `bfb0423` `src/test/remote/fixtures/e2e-tools-full.json:5789` & `src/generated/tools.json:5789` | No — same as above | FALSE POSITIVE (classic dummy placeholder in e2e test fixture) | Dismiss | `false_positive` |
| 5 | pii_email_address | `secondary+2@email.com` | commit `bfb0423` `src/test/remote/fixtures/e2e-tools-full.json:5212` & `src/generated/tools.json:5212` | No — same as above | FALSE POSITIVE (placeholder in e2e test fixture) | Dismiss | `false_positive` |

Notes:
- All five alerts came from `commit` locations (no PR-body / issue-body / PR-comment exposures).
- `@email.com` is a non-functional placeholder TLD-style domain commonly used as fake data; `foo@gmail.com` and `someone@gmail.com` are the canonical generic placeholders. None resolve to real users.
- For alert 1 only, replacing the placeholder with `user@example.com` (a domain reserved for documentation per RFC 2606) prevents future re-flagging without changing meaning. This is a documentation polish, **not** a security fix.

## Code Scanning

| # | Rule | Severity | File:Line | Classification | Action | Dismiss reason |
|---|------|----------|-----------|----------------|--------|----------------|
| 1 | `actions/missing-workflow-permissions` | medium | `.github/workflows/ci.yml:8` | LIVE BUG | Add top-level `permissions: contents: read` (diff below) | n/a — auto-resolves on next scan |
| 2 | `actions/missing-workflow-permissions` | medium | `.github/workflows/release.yml:9` | LIVE BUG | Add top-level `permissions: contents: read` (diff below); npm publish uses `NODE_AUTH_TOKEN` secret, not `GITHUB_TOKEN`, so no extra permissions needed | n/a — auto-resolves on next scan |

## Proposed Diffs

### Diff 1 — `.github/workflows/ci.yml` (alert #1)

```diff
 name: CI

 on:
   pull_request

+permissions:
+  contents: read
+
 jobs:
   build:
     name: "Build & Test"
     runs-on: ubuntu-latest

     steps:
     - name: Checkout code
       uses: actions/checkout@v4
```

Rationale: `actions/checkout` only needs `contents: read`. CI runs lint/build/test — no PR comments, status updates, or releases.

### Diff 2 — `.github/workflows/release.yml` (alert #2)

```diff
 name: Publish Package to npmjs

 on:
   release:
     types: [published]

+permissions:
+  contents: read
+
 jobs:
   build:
     runs-on: ubuntu-latest
     steps:
       - name: Checkout code
         uses: actions/checkout@v4
```

Rationale: Workflow triggers on `release: published`, which is itself created externally. The publish step authenticates to npm via `NODE_AUTH_TOKEN` (`secrets.NPM_TOKEN`), not via the workflow's `GITHUB_TOKEN`. `contents: read` is sufficient for `actions/checkout`. If npm-provenance is added later (`npm publish --provenance`), bump to `id-token: write` at that time.

### Diff 3 (optional polish, not required) — replace placeholder in `src/index.ts`

```diff
-**Find first 5 devices for user with email "someone@gmail.com":**
+**Find first 5 devices for user with email "user@example.com":**
 - Query: limit=5
-- Body: {"searchTerm": "someone@gmail.com", "searchFields": ["people.primaryEmail"]}
+- Body: {"searchTerm": "user@example.com", "searchFields": ["people.primaryEmail"]}
```

Rationale: `example.com` is reserved by IANA for documentation (RFC 2606), so it won't trigger PII pattern detectors and won't accidentally bounce real mail. Cosmetic only; alert can be dismissed as-is.

## Dismissal Commands (run after human approval)

```bash
# Alert 1 — placeholder in tool-description docstring
gh api -X PATCH repos/moneyforward-i/admina-mcp-server/secret-scanning/alerts/1 \
  -f state=resolved \
  -f resolution=false_positive \
  -f resolution_comment="Placeholder email used as a usage example in src/index.ts get_devices tool description; not a real address. Optionally being replaced with user@example.com (RFC 2606 reserved domain) for clarity."

# Alert 2 — placeholder in e2e test fixture / generated tools.json
gh api -X PATCH repos/moneyforward-i/admina-mcp-server/secret-scanning/alerts/2 \
  -f state=resolved \
  -f resolution=false_positive \
  -f resolution_comment="Placeholder address (@email.com is a non-functional test domain) inside src/test/remote/fixtures/e2e-tools-full.json and src/generated/tools.json — e2e test fixture / generated API tool registry data, not a real user."

# Alert 3 — placeholder in e2e test fixture
gh api -X PATCH repos/moneyforward-i/admina-mcp-server/secret-scanning/alerts/3 \
  -f state=resolved \
  -f resolution=false_positive \
  -f resolution_comment="Placeholder address (@email.com is a non-functional test domain) inside e2e test fixture / generated tools.json — not a real user."

# Alert 4 — classic dummy placeholder in e2e test fixture
gh api -X PATCH repos/moneyforward-i/admina-mcp-server/secret-scanning/alerts/4 \
  -f state=resolved \
  -f resolution=false_positive \
  -f resolution_comment="Classic dummy placeholder foo@gmail.com inside src/test/remote/fixtures/e2e-tools-full.json and src/generated/tools.json — not a real user."

# Alert 5 — placeholder in e2e test fixture
gh api -X PATCH repos/moneyforward-i/admina-mcp-server/secret-scanning/alerts/5 \
  -f state=resolved \
  -f resolution=false_positive \
  -f resolution_comment="Placeholder address (@email.com is a non-functional test domain) inside e2e test fixture / generated tools.json — not a real user."
```

Code-scanning alerts (#1 and #2) auto-resolve once the workflow permission blocks are merged — no PATCH needed. If for some reason the fix is rejected (e.g., the project decides to keep default broad permissions), the dismissal pattern would be:

```bash
# Only if fix is rejected — otherwise let next CodeQL scan close these.
gh api -X PATCH repos/moneyforward-i/admina-mcp-server/code-scanning/alerts/1 \
  -f state=dismissed \
  -f "dismissed_reason=won't fix" \
  -f dismissed_comment="Accepted risk: <reason>"

gh api -X PATCH repos/moneyforward-i/admina-mcp-server/code-scanning/alerts/2 \
  -f state=dismissed \
  -f "dismissed_reason=won't fix" \
  -f dismissed_comment="Accepted risk: <reason>"
```

## Prevention Follow-ups

- Enable **Secret Scanning push protection** in the repo's Security settings to block future commits matching the PII-email pattern at push time.
- Add a default top-level `permissions: contents: read` to any new workflow files going forward; consider a `.github/workflows`-scoped linter or a `paths-ignore` adjustment in `.github/codeql/codeql-config.yml` if false positives arise from intentionally permissive jobs.
- For documentation/example data, standardize on RFC 2606 reserved domains (`example.com`, `example.org`, `example.net`) to avoid future PII detector noise.
