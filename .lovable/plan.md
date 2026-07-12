# CH-PERM-VERIFY-1 — Permission Regression Harness

## Findings from exploration (must decide before I build)

**1. The Communication Hub admin routes are NOT wrapped in any router-level gate.**
In `src/components/routing/AppRoutes.tsx` lines 2229–2251, every `/admin/communication-hub/*` route is a bare `<Route element={<Suspense><Page/></Suspense>} />` — no `<ProtectedRoute>`, no `AdminRoute`, no permission check. There is a legacy Trace Center path (`/admin/n`, `/admin/n/:traceId`) that is also bare.

That contradicts the earlier "manual checks confirmed AdminRoute redirects plain users" note. Today, a plain authenticated user who *types the URL* reaches the page shell. The reason data doesn't leak is:
- Supabase RLS on `communication_hub_trace_*`, `communication_message`, `communication_request`, etc. returns empty rows.
- Sidebar/menu hides the link.

So the harness will either (a) document this posture as "route reachable, data protected by RLS" or (b) I add real client-side gates on the CH admin routes first. Please confirm which.

**2. There is no Playwright setup in the project.** `package.json` has vitest only. Adding `@playwright/test` + browsers to `devDependencies` is a ~200MB install and a separate CI job.

**3. There is no test-user provisioning.** Creating admin / `system_administration.view` / `communication_hub.view` / plain users needs either (a) a seed migration that inserts into `auth.users` + `user_roles` + permission tables, or (b) documented manual setup with credentials pulled from CI secrets. Auto-seeding into `auth.users` requires the service-role key which is not available on Lovable Cloud.

## Proposed plan

### Part A — Route-gate audit + fix (blocks everything else)

1. Read `src/components/auth/ProtectedRoute.tsx` and any existing permission wrappers.
2. Create a small `CommHubAdminRoute` wrapper that requires **admin OR `system_administration.view` OR `communication_hub.view`**, redirects unauthenticated to `/login`, and shows a "Not authorized" screen for authenticated-but-unpermitted.
3. Wrap all 17 CH admin routes (including legacy `/admin/n` and `/admin/n/:traceId`) with it in `AppRoutes.tsx`. No page-level logic change.
4. Deprecate `/admin/n*` behind a redirect to `/admin/communication-hub/traces*` (its canonical path).

### Part B — Deterministic unit tests (Vitest, always run in CI)

Add `src/__tests__/comm-hub/permission-matrix.test.tsx`:

- Fixture: 4 auth contexts (admin / sys-admin.view / comm-hub.view / plain).
- Render `<MemoryRouter initialEntries={[path]}><AppRoutesSubtree/></MemoryRouter>` for each of the 15 CH admin paths.
- Assert: admin sees page, view-permission roles see page, plain user sees "Not authorized" or is redirected.
- Also assert `TraceCenterPage` calls its data fetcher only when authorized (mocked service).

This is fast, hermetic, needs no browsers, and locks the matrix into every PR.

### Part C — Playwright harness scaffold (opt-in, documented)

Create `e2e/comm-hub-permissions.spec.ts` + `playwright.config.ts` + `docs/testing/comm-hub-permission-harness.md`:

- 4 storage-state files under `e2e/.auth/` (git-ignored), populated by a `e2e/setup/login.ts` script that reads credentials from env vars (`CH_TEST_ADMIN_EMAIL`, `CH_TEST_ADMIN_PASSWORD`, etc.).
- One test per role × path in the 15-screen matrix, using `data-testid="comm-hub-page"` root attributes I add to each shell.
- Assertions are *presence of page marker* vs *presence of "Not authorized"* — no data reads, no sends, no mutations.
- README explains: install `@playwright/test`, run `bunx playwright install chromium`, populate credentials, run `bunx playwright test`.
- Not wired into the default `test` script so it never runs by accident in Lovable Cloud.

### Part D — Small stable selectors

Add `data-testid="comm-hub-page"` to `CommunicationHubWorkspaceShell` and `OperationsShell` root elements, and `data-testid="not-authorized"` to the new gate's denial screen. No copy or behavior changes.

## What I will NOT do

- No email send, no cron/bulk enable, no live-gate change, no template mutation.
- No new `communication_request`/`communication_message` rows.
- No rename of files, components, routes, event codes, or typed-confirmation phrases.
- No schema changes (test users are created outside the app or via a Lovable Cloud user-management step, not a migration).
- No deletion of `/admin/n*` — only a redirect.

## Questions I need answered before I start

1. **Route gates**: OK to add a `CommHubAdminRoute` wrapper and require `admin || system_administration.view || communication_hub.view`? Or do you want me to document the current "URL reachable, data blocked by RLS" posture and only add tests?
2. **Playwright**: Add the harness scaffold + docs (opt-in, credentials from env)? Or skip Playwright entirely and rely on Vitest route-level tests only?
3. **Test users**: Do these already exist somewhere I can reference (env var names, credential vault), or should the harness only ship as scaffold + setup docs?

Once you answer 1–3, I implement in a single pass and report per your acceptance criteria.
