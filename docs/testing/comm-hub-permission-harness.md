# Communication Hub — Permission Regression Harness

This harness enforces the CH-PERM-VERIFY-1 access matrix. It has two layers:

## Layer 1 — Vitest permission-matrix test (always on)

`src/__tests__/comm-hub/permission-matrix.test.tsx` runs with `bun run test`.
It exercises `CommHubAdminRoute` directly against mocked auth hooks and
covers every intended-protected CH path against every role in the matrix.

No network, no Supabase, no browser. This is the CI gate.

## Layer 2 — Playwright end-to-end harness (opt-in)

Files:

- `playwright.config.ts`
- `e2e/comm-hub-permissions.spec.ts`
- `e2e/setup/login.ts`

Not wired into the default `test` script — it never runs in Lovable Cloud CI
by accident.

### Test users required

Create four users in the target environment (dev or staging — **never
production**) with the following permission grants:

| Role key       | Grants                                    |
| -------------- | ----------------------------------------- |
| admin          | is_admin() returns true (any Admin role) |
| sysAdminView   | `system_administration.view` only         |
| commHubView    | `communication_hub.view` only             |
| plain          | authenticated, no admin/system/comm-hub   |

Follow the project's user-roles pattern (`public.user_roles` + `has_role`
security-definer function; permissions via `role_permissions`). Do not
grant these users any send/enqueue/dispatch capability.

### One-time setup

```bash
# 1. Install Playwright (dev dependency; ~200 MB browsers)
bun add -D @playwright/test
bunx playwright install chromium

# 2. Export credentials (never commit these)
export CH_PERM_BASE_URL="http://localhost:8080"
export CH_TEST_ADMIN_EMAIL="..."           CH_TEST_ADMIN_PASSWORD="..."
export CH_TEST_SYS_ADMIN_VIEW_EMAIL="..."  CH_TEST_SYS_ADMIN_VIEW_PASSWORD="..."
export CH_TEST_COMM_HUB_VIEW_EMAIL="..."   CH_TEST_COMM_HUB_VIEW_PASSWORD="..."
export CH_TEST_PLAIN_EMAIL="..."           CH_TEST_PLAIN_PASSWORD="..."

# 3. Mint the four storage-state fixtures
bunx tsx e2e/setup/login.ts
```

`e2e/.auth/*.json` is git-ignored.

### Run the harness

```bash
bunx playwright test
```

Each role × path is asserted with the `data-testid="comm-hub-not-authorized"`
selector. No email is sent, no live gate is toggled, no cron/bulk is enabled.

### What is NOT tested here

- Data-row filtering (RLS) — covered by RLS policy tests in the DB layer.
- Typed-confirmation gates — covered by pre-existing CH pilot/live tests.
- Cron/bulk enablement — intentionally out of scope; this harness must
  never touch those switches.

### Extending the matrix

To add a screen, append its path to `PATHS` in both files:

- `src/__tests__/comm-hub/permission-matrix.test.tsx` (Vitest, mandatory)
- `e2e/comm-hub-permissions.spec.ts` (Playwright, optional)

To add a role, append a `RoleFixture` in the spec, add credentials env vars
for it, and add its allowlist expectation.
