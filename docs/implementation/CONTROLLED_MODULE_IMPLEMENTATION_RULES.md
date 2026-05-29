# Controlled Module Implementation Rules

**Status:** MANDATORY for every future module (Benefits & Claims, Finance,
Inspector, Self-Employed, etc.). Derived from defects found and resolved
during Compliance & Enforcement stabilization (2026-05-25 → 2026-05-28).

**Source evidence:**
- `docs/compliance/COMPLIANCE_INVENTORY.md`
- `docs/compliance/final_stabilization_report.md`
- `docs/compliance/implementation_inventory.md`
- `docs/compliance/menu_alignment_summary.md`
- `docs/compliance/route_acceptance_sweep.md`
- `docs/compliance/reports_correction_plan.md`
- `src/pages/compliance/ComplianceRouteGate.tsx`
- `src/pages/compliance/Routes.tsx`
- `src/components/routing/AppRoutes.tsx`
- `src/components/sidebar/menuItems/complianceMenuItems.ts`

---

## 0. Why these rules exist (Compliance findings → Rules)

| # | Compliance finding | Converted into rule |
|---|---|---|
| 1 | Menu items pointed to URLs with no route registered in active `AppRoutes.tsx` (e.g. `/compliance/my-work-queue`, all 6 Notices items) — produced 404 even though pages existed in the unmounted `pages/<module>/Routes.tsx`. | **R-ROUTE-1, R-ROUTE-2** — only the route table actually mounted at runtime counts; every menu URL must resolve in it. |
| 2 | Multiple Reports submenu items shared one URL → identical content on different labels (Violation/Inspector/C3/Arrears/Audit/Arrangements/Legal/Trends Reports, 28 items). | **R-ROUTE-3, R-MENU-2** — every leaf menu item gets a unique URL and its own page. |
| 3 | `PlaceholderPage` left visible by default on Setup → Feature Toggles, Payment Arrangement Rules, Risk Scoring, Schedule Settings. | **R-PLACEHOLDER-1/2** — visible-by-default items must be real screens; placeholders only behind an OFF feature toggle. |
| 4 | Feature toggles existed in `featureToggles.ts` but menu/route still rendered as if enabled. | **R-TOGGLE-1/2** — every flag must gate both menu visibility AND route registration. |
| 5 | Action buttons (Approve, Verify, Reject) had no permission gate; only routes were gated. | **R-PERM-2** — both route AND every privileged action button must be wrapped. |
| 6 | `riskPolicyService`, `riskFactorService` returned `MOCK_RISK_*` arrays in production. | **R-MOCK-1** — no `MOCK_*` constants in `src/services/` for active modules. |
| 7 | `weeklyAuditPlanService.review` wrote `approved_by = 'SYSTEM'`; `centralPaymentArrangementService` used `userCode ?? 'SYSTEM'`. | **R-AUDIT-1** — `requireUserCode()` must throw; no `'SYSTEM'` fallback. |
| 8 | Admin pages (Feature Toggles, Payment Arrangement Rules) rendered UI but did not persist changes. | **R-ADMIN-1** — every admin screen must round-trip to its `*_*` table with `updated_by` / `updated_at`. |
| 9 | Approval flows on notices/arrangements were bypassing the existing `workflow_tasks` engine. | **R-WORKFLOW-1** — reuse the global workflow engine; never re-implement maker/checker locally. |
| 10 | TypeScript build passed but manual acceptance found 404s, placeholders, identical-URL menu items. | **R-VERIFY-1/2** — green build is not acceptance; route sweep is mandatory. |
| 11 | Reusable Compliance work items (`feeService` TODOs, mock arrays) were not re-listed in the final report. | **R-DOC-1** — every pass updates its module's implementation inventory + final report. |
| 12 | Hardcoded role-name checks were added in early Compliance iterations, then removed in favour of `useHasCapability` / `ComplianceRouteGate`. | **R-PERM-3** — never check role names in components; use capability hooks. |
| 13 | Some `ce_*` tables were re-created instead of extended, risking data loss. | **R-MIGRATE-1** — additive migrations only (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`). |
| 14 | Reports hub showed cards linking to the wrong drill-down URL. | **R-ROUTE-3** — hub cards, sidebar items, and `app_modules` rows must all point to the same canonical URL. |

---

## 1. Mandatory pre-change checklist

Before writing any code for a new module page or screen, the Lovable
agent must confirm in its plan / response:

- [ ] **PC-1** Read the module's menu file (`src/components/sidebar/menuItems/<module>MenuItems.ts`) and list every leaf item that will be touched.
- [ ] **PC-2** Read the module's active route registration in `src/components/routing/AppRoutes.tsx` (not just the per-module `Routes.tsx` — that file is not mounted unless explicitly imported).
- [ ] **PC-3** Read the module's feature toggle map (`src/lib/<module>/featureToggles.ts` if any) and capture which toggles will affect the change.
- [ ] **PC-4** Identify the Supabase tables the screen reads/writes. Confirm they already exist (`supabase--read_query`) or that an additive migration is included in the same pass.
- [ ] **PC-5** Identify the permission module key (`ce_*`, `bn_*`, etc.) and the `requiresPermission` legacy string already wired on the menu item.
- [ ] **PC-6** Search for existing components with similar purpose under `src/pages/<module>/` so an existing implementation is wired up instead of a new placeholder being created.
- [ ] **PC-7** Confirm the workflow engine (`workflow_tasks`, `workflow_steps`) is the destination for any approval action — never a local table.

---

## 2. Mandatory implementation rules

### Routing (R-ROUTE-*)

- **R-ROUTE-1** Every URL referenced from a sidebar menu item, a hub card, a tile, a notification deep-link, or an `app_modules.url` row **must** be registered in `src/components/routing/AppRoutes.tsx`. The per-module `src/pages/<module>/Routes.tsx` is treated as documentation unless explicitly mounted.
- **R-ROUTE-2** Every newly added URL must resolve to one of: a real page component, a `<Navigate>` redirect to a working canonical URL, or `PlaceholderPage` **only if its feature toggle defaults to `false`**.
- **R-ROUTE-3** Distinct leaf menu items must have distinct URLs and distinct page components. If two items legitimately share the same dashboard, prefer one menu item with the canonical URL plus a different drill-down for the second.
- **R-ROUTE-4** Aliases / legacy URLs are added as `<Navigate>` redirects, never by duplicating the page mount.

### Menu (R-MENU-*)

- **R-MENU-1** Every menu item carries `requiresPermission` (legacy string already in use for the module, e.g. `manage_compliance`, `manage_benefits`).
- **R-MENU-2** No two leaf items in the same module may share the same `url`. CI/manual sweep must fail if duplicates appear.
- **R-MENU-3** When a leaf item is gated by a feature toggle, the menu builder calls `isXxxFeatureEnabled(key)` so it disappears together with its route.

### Placeholders (R-PLACEHOLDER-*)

- **R-PLACEHOLDER-1** `PlaceholderPage` is allowed only when the corresponding feature toggle is **off by default**. A visible-by-default menu item rendering `PlaceholderPage` is a defect.
- **R-PLACEHOLDER-2** Placeholders must clearly say "Configuration or implementation pending" and never display fake business numbers, charts, or sample rows.

### Feature toggles (R-TOGGLE-*)

- **R-TOGGLE-1** Every toggle key declared in `src/lib/<module>/featureToggles.ts` must be honoured in **both** the menu builder and the route registration (gate both sides).
- **R-TOGGLE-2** Toggles default to `true` only when the corresponding screen is fully implemented and connected to its Supabase table. Otherwise default to `false`.

### Permissions (R-PERM-*)

- **R-PERM-1** Every protected route is wrapped in the module's route gate (`ComplianceRouteGate` for Compliance; equivalent gate must exist per module) **and** `PermissionWrapper` with the correct module key.
- **R-PERM-2** Every privileged action button (Approve, Reject, Verify, Cancel, Delete, Post, Send, Override) is wrapped with `PermissionWrapper` / `PermissionButton`. Route-level gating alone is not enough.
- **R-PERM-3** Never hardcode role-name checks (e.g. `role === 'Admin'`). Use the capability hook (`useHasCapability`, `useActionPermissions`) or the legacy permission strings already registered.

### Data integrity (R-MOCK-*, R-AUDIT-*)

- **R-MOCK-1** No `MOCK_*`, `SAMPLE_*`, `FAKE_*` constants in active services under `src/services/<module>*`. Test fixtures live under `src/test/` only.
- **R-MOCK-2** No hardcoded business numbers in page components. Empty/loading states must be honest ("No records found"), never zero-filled samples.
- **R-MOCK-3** Every list query uses Supabase (`@/integrations/supabase/client`) and respects the 1k-row chunking rule (`.range()` for paginated UI, chunked `while` loop for batch processing).
- **R-AUDIT-1** No service writes `created_by = 'SYSTEM'` or `userCode ?? 'SYSTEM'`. Use `requireUserCode()` (or equivalent) which throws when no session user_code is available. Workflow/job-runner contexts that legitimately have no user must set `created_by = 'SYSTEM_JOB'` with the job id captured in metadata.
- **R-AUDIT-2** Every mutation passes through `useAuditedMutation` (or the service-level equivalent) so `system_audit_trail` rows are produced.

### Admin & setup pages (R-ADMIN-*)

- **R-ADMIN-1** Every admin/setup screen reads from and writes to a real `<module>_*` table (existing or added via additive migration). Saved values must survive a page reload — verified manually.
- **R-ADMIN-2** Admin screens stamp `updated_by` (user_code) and `updated_at` on every save.
- **R-ADMIN-3** Admin screens never store configuration in `localStorage`, `sessionStorage`, or in-memory module state.

### Workflow (R-WORKFLOW-*)

- **R-WORKFLOW-1** Approval, escalation, recall, and reassign actions go through `workflow_tasks` and `workflow_steps`. No new local `pending_*` table for maker/checker.
- **R-WORKFLOW-2** Step completion happens **after** side-effects succeed (transactional with the business write where possible).

### Migrations (R-MIGRATE-*)

- **R-MIGRATE-1** All DDL is additive: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, seed with `ON CONFLICT DO NOTHING`. No `DROP COLUMN`, `DROP TABLE`, `ALTER COLUMN TYPE`, or `TRUNCATE` without an explicit user-approved decommission plan.
- **R-MIGRATE-2** Every new `public.<table>` migration includes the `GRANT` block as documented in project rules.
- **R-MIGRATE-3** Re-running a migration must be a no-op (idempotent).

### Reuse of existing tables (R-REUSE-*)

- **R-REUSE-1** Before creating a new table, query `information_schema.tables` and read `docs/<module>/schema_delta.md` (if present). Prefer extending an existing table with new columns.
- **R-REUSE-2** Shared concepts (employer, person, audit trail, workflow tasks, notifications, feature flags, file storage) reuse the existing global tables — never module-local clones.

---

## 3. Mandatory post-change verification checklist

After implementation, **before** claiming the work is done, the agent must
fill in and report each item:

- [ ] **PV-1 Route sweep:** Every URL listed in §4 Route Acceptance Matrix resolves to ✅ Works, 🔁 Redirect, or ⚠️ PlaceholderPage-behind-OFF-toggle. Zero visible-by-default 404s.
- [ ] **PV-2 Placeholder sweep:** No visible-by-default route renders `PlaceholderPage`.
- [ ] **PV-3 Duplicate URL sweep:** No two leaf menu items share a URL.
- [ ] **PV-4 Mock data sweep:** `rg -n "MOCK_|SAMPLE_|FAKE_" src/services/<module>` returns nothing.
- [ ] **PV-5 SYSTEM fallback sweep:** `rg -n "'SYSTEM'|\"SYSTEM\"|\\?\\? *'SYSTEM'" src/services/<module>` returns nothing (job-runners excepted with `SYSTEM_JOB`).
- [ ] **PV-6 Persistence check:** Each admin screen saved → page reloaded → values still present.
- [ ] **PV-7 Permission check:** With a no-permission test user, both route and privileged buttons are blocked.
- [ ] **PV-8 Workflow check:** Approval action creates a `workflow_tasks` row and audit trail entry.
- [ ] **PV-9 Build:** TypeScript build green.
- [ ] **PV-10 Documentation:** Module's `implementation_inventory.md`, `final_stabilization_report.md`, and `route_acceptance_sweep.md` are updated in the same pass.

---

## 4. Route Acceptance Matrix template

Reproduce per module in `docs/<module>/route_acceptance_sweep.md`.

Status legend (identical to Compliance):
✅ Works · 🔁 Redirect · ⚠️ PlaceholderPage · ❌ 404 · 🚫 Feature toggle · 🔒 Permission denied

```
## <Group label>

| Menu Label | Route Path | Component | Status | Real Data | Deferred? | Recommended Action |
|---|---|---|---|---|---|---|
| ... | /<module>/... | <ComponentName> | ✅ Works | Yes (<table>) | No | None |
```

End with a Summary block:

```
## Summary

- Working routes: N
- Working redirects: N
- PlaceholderPage (intentional, toggle-off): N
- Visible-by-default 404s: 0   ← MUST be zero
- Toggle-hidden 404s: N
```

---

## 5. Feature flag and permission matrix template

Reproduce per module in `docs/<module>/feature_and_permission_matrix.md`.

```
| Toggle key | Default | Menu items gated | Routes gated | Permission key | Notes |
|---|---|---|---|---|---|
| bn.claims.intake | true | Benefits > Claims > Intake | /benefits/claims/intake | manage_benefits | wired |
| bn.claims.medicalBoard | false | Benefits > Claims > Medical Board | /benefits/claims/medical-board | manage_benefits | placeholder, off |
```

---

## 6. Detection rules (used by the post-change sweep)

### 6.1 Mock-data detection rule (R-MOCK-1)

A file under `src/services/<module>` fails the rule if any of these match:

- Identifier starting with `MOCK_`, `SAMPLE_`, `FAKE_`, `DEMO_`, `STUB_`.
- An array literal of business rows assigned to a `const` and returned by a service function.
- An `if (import.meta.env.DEV)` branch returning fabricated data.

Suggested sweep:
```
rg -nE "\\b(MOCK_|SAMPLE_|FAKE_|DEMO_|STUB_)" src/services/<module>
rg -n  "return \\[\\s*\\{" src/services/<module>
```

### 6.2 Placeholder detection rule (R-PLACEHOLDER-1)

A route fails if **all** of the following are true:
- It is registered to `PlaceholderPage` (directly or via lazy import).
- Its menu item is visible by default (no toggle, or toggle defaults to `true`).
- The page is reachable by a user with the default permission set.

Suggested sweep:
```
rg -n "PlaceholderPage" src/components/routing/AppRoutes.tsx
```
then cross-reference each path with the module menu and toggle map.

### 6.3 404 detection rule (R-ROUTE-1)

For every leaf URL in `src/components/sidebar/menuItems/<module>MenuItems.ts`:
- Confirm the same path string appears in `src/components/routing/AppRoutes.tsx`.
- Confirm the matched element resolves to a component or `<Navigate>` (not omitted, not commented out).
- Confirm the URL also exists in `app_modules` (DB) when the module is DB-driven.

Suggested sweep:
```
node -e "/* extract urls and grep AppRoutes */"
```

### 6.4 Existing-table reuse rule (R-REUSE-1)

Before any `CREATE TABLE`:
```
select table_name from information_schema.tables
where table_schema='public' and table_name like '<module-prefix>_%';
```
If a candidate already exists, extend it; do not create a new one.

### 6.5 Additive migration rule (R-MIGRATE-1)

A migration fails the rule if it contains any of:
`DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN ... TYPE`, `TRUNCATE`, `RENAME COLUMN` (without an explicit decommission plan).

---

## 7. Required response format for every future Lovable prompt

Every implementation response for a controlled module must follow this
exact structure (markdown headings, in this order):

```
## Pre-change checklist
- PC-1 … PC-7 results (yes/no + 1-line evidence each)

## Plan
- Bullet list of files to add/change and their purpose
- Migrations included (yes/no, additive confirmed)
- Feature toggles touched
- Permission keys reused

## Implementation
- File-by-file summary of what was written

## Post-change verification
- PV-1 … PV-10 results (pass/fail + 1-line evidence each)
- Route Acceptance Matrix diff (new/changed rows)
- Feature & Permission Matrix diff (new/changed rows)

## Documentation updates
- Paths of inventory/report/sweep files updated

## Final confirmation
- "All visible-by-default routes resolve. No mock data. No 'SYSTEM' fallbacks. Admin saves persist. Workflow engine used. Build green."
```

If any PV-* item fails, the response must NOT claim completion — it must
list the failing items and either fix or surface them as blockers.

---

## 8. Final confirmation format (paste verbatim)

When and only when all PV-* items pass, finish the response with:

```
✅ Final confirmation — <Module> <Sub-area>
- Visible-by-default 404s: 0
- Placeholders visible by default: 0
- Duplicate menu URLs: 0
- Mock arrays in active services: 0
- Unsafe 'SYSTEM' fallbacks: 0
- Admin persistence reload-tested: pass
- Privileged buttons permission-gated: pass
- Workflow engine reused (no local maker/checker): pass
- TypeScript build: pass
- Docs updated: <list of files>
```

---

## 9. Mandatory prompt block for Benefits & Claims (and every future module)

Paste the block below verbatim into every implementation prompt for the
target module. The Lovable agent must obey it in addition to its system
prompt.

```
CONTROLLED MODULE IMPLEMENTATION CONTRACT
=========================================
You are implementing a controlled module screen. You MUST follow
docs/implementation/CONTROLLED_MODULE_IMPLEMENTATION_RULES.md in full.

Before coding:
1. Run the §1 Pre-change checklist (PC-1..PC-7) and report results.
2. Read the active route table (src/components/routing/AppRoutes.tsx),
   the module menu file, and the module feature toggle map.
3. Confirm the Supabase tables you will touch already exist; if not,
   include ONE additive migration in the same pass (R-MIGRATE-1/2/3).
4. Reuse the global workflow engine, audit trail, permission wrapper,
   feature_flags table, and existing capability hooks. Do NOT clone them.

While coding:
- No MOCK_/SAMPLE_/FAKE_ constants in active services. (R-MOCK-1)
- No 'SYSTEM' fallback for created_by/updated_by. (R-AUDIT-1)
- Every privileged action button uses PermissionWrapper. (R-PERM-2)
- Every visible-by-default menu item resolves to a REAL page,
  not PlaceholderPage. (R-PLACEHOLDER-1)
- Every new URL is registered in AppRoutes.tsx, not just in the
  per-module Routes.tsx. (R-ROUTE-1)
- No two leaf menu items share a URL. (R-ROUTE-3 / R-MENU-2)
- Admin saves go to a real table with updated_by/updated_at and survive
  reload. (R-ADMIN-1/2/3)

After coding:
- Run the §3 Post-change verification (PV-1..PV-10) and report each.
- Update docs/<module>/implementation_inventory.md,
  final_stabilization_report.md, and route_acceptance_sweep.md.
- Reply using the §7 Required response format.
- Only claim DONE by emitting the §8 Final confirmation block, and only
  if every PV-* item passes.

Do NOT report "done" on the basis of a green TypeScript build alone.
Build success is necessary but NOT sufficient. (R-VERIFY-1/2)
```

---

## 10. Module-specific scaffolding required before Benefits & Claims work begins

These deliverables are prerequisites the first Benefits & Claims prompt
must produce (or confirm already exist) before any screen work:

1. `src/pages/benefits/BenefitsRouteGate.tsx` — mirror of `ComplianceRouteGate`.
2. `src/lib/benefits/featureToggles.ts` — mirror of `src/lib/compliance/featureToggles.ts`.
3. `src/lib/benefits/capabilities.ts` — mirror of `src/lib/compliance/capabilities.ts` with `LEGACY_PERMISSION_FALLBACK = 'manage_benefits'`.
4. `docs/benefits/route_acceptance_sweep.md` — initial sweep using the §4 template, seeded from `benefitsMenuItems.ts` / `bnMenuItems.ts`.
5. `docs/benefits/feature_and_permission_matrix.md` — initial matrix using the §5 template.
6. `docs/benefits/implementation_inventory.md` — placeholder file to be appended to on every pass.
7. `docs/benefits/final_stabilization_report.md` — placeholder file to be appended to on every pass.

---

End of document.
