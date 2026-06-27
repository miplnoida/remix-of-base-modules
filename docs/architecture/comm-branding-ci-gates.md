# Phase 14 — Acceptance Gates (CI)

These gates enforce the enterprise comm/branding architecture in CI.

## 1. TypeScript

```
bunx tsgo
```
Must exit zero.

## 2. Resolver-only imports

Comm/branding screens may import only from `@/lib/enterprise`. Direct
imports of `@/integrations/supabase/client` from those screens are
blocked.

Lint command:
```
rg -n "from \"@/integrations/supabase/client\"" \
   src/pages/admin/organization src/pages/admin/communication \
   && exit 1 || exit 0
```

Module code (Legal / Benefits / Compliance / Finance / HR / Registration
/ Employer Services) must not import from `@/lib/comm/*` directly:
```
rg -n "from \"@/lib/comm/" \
   src/features/legal src/features/benefits src/features/compliance \
   src/features/finance src/features/hr src/features/registration \
   src/features/employer-services \
   && exit 1 || exit 0
```

## 3. Hardcoded comm content

Grep gate — no org/department/branding strings hardcoded in app code:
```
rg -n "St\\. Christopher and Nevis Social Security Board|Bay Road, Basseterre" \
   src/features src/pages \
   && exit 1 || exit 0
```

## 4. Owner-type capabilities

Every comm/branding owner type ships:
- versioning (`*_version` table or `version_no` column)
- audit log (`*_audit_log` or written via `system_audit_trail`)
- usage tracking (`whereUsed()` in referenceRegistry)
- replace-before-delete (uses `ReplaceReferencesDialog`)

Verified by `src/lib/enterprise/healthChecks.ts` at runtime and by the
existing `referenceRegistry` registration test suite at build time.

## How to enable

Add a CI step that runs the four checks above; fail the build on any
non-zero exit. Health-check failures are surfaced in
`EnterpriseHealthPage` for ops review (non-blocking).
