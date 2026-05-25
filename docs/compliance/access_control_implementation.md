# Compliance & Enforcement — Access-Control Implementation

Generated: 2026-05-25.
Companion to: [`access_control_inventory.md`](./access_control_inventory.md).

This document records **how** Compliance plugs into the existing project
access-control model. **No new permission system was introduced.** Every
gate uses the canonical `app_modules` / `module_actions` / `role_permissions`
chain and the `useSupabaseAuth` → `get_user_permissions` RPC pipeline.

---

## 1. What changed

| Layer | Change | Reused existing infrastructure |
|---|---|---|
| Permission catalogue | Seeded canonical actions on every Compliance module | `module_actions` table |
| Role bundles | Granted bundles to `ComplianceInspector`, `SeniorInspector`, `ComplianceHead` | `roles` + `role_permissions` |
| Frontend constants | Added `MODULE_NAMES.CE_*` and workflow `ACTION_NAMES` (`APPROVE`, `REJECT`, `ASSIGN`, `CLOSE`, `REOPEN`, `ISSUE`, `ESCALATE`, `WAIVE`, `CONFIGURE`, `RUN`) | `src/hooks/useActionPermission.ts` |
| Route protection | Centralised `<ComplianceRouteGate>` wraps every `/compliance/*` route | `PermissionProtectedRoute` → `useCanAccessModule` → `get_user_permissions` RPC |
| Sensitive actions | Buttons use the existing `<PermissionButton moduleName actionName>` | `src/components/ui/permission-button.tsx` |
| Screen-level gates | Pages call `useActionPermissions(MODULE_NAMES.CE_*)` and render `<AccessDenied/>` on `!canView()` | `useActionPermissions` + `<AccessDenied/>` |
| Workflow actions | Continue to flow through the generic workflow engine + `useWorkflowActions`; gated by both workflow assignment **and** `can('approve' / 'reject' / ...)` | `workflow_definitions`, `useWorkflowActions` |

**No RLS introduced.** Compliance uses the same role-based access control as
every other module in the project (per the project memory rule
"do not implement Row Level Security").

---

## 2. Action vocabulary

Authorised action names (the only values accepted by `can(...)`):

`view`, `create`, `edit`, `delete`, `submit`, `approve`, `reject`,
`assign`, `close`, `reopen`, `export`, `issue`, `escalate`, `waive`,
`configure`, `run`.

All are exported as `ACTION_NAMES.*` constants. **Adding any new action
name requires extending `ACTION_NAMES` first** — do not pass string literals.

---

## 3. Role bundles seeded

Granted via the existing `role_permissions` table (idempotent migration,
`ON CONFLICT DO NOTHING`). No hard-coded role-name checks were added to
application code — all gating reads `get_user_permissions(_user_id)`.

| Role (`roles.role_name`) | View | Field create/edit/submit/close | Approve / reject / assign / waive / escalate / issue | Configure / run (admin) |
|---|---|---|---|---|
| `ComplianceInspector` | all Compliance modules | yes (field, violations, inspections, weekly reports) | — | — |
| `SeniorInspector` | all Compliance modules | yes | yes (plan revisions, weekly-report review, approval inbox, notices, arrangement approval, recommendation queue, review queue; waive on penalties; escalate on breach/legal; issue on notices) | — |
| `ComplianceHead` | all Compliance modules | yes (all) | yes (all) | yes (all admin/automation/configuration modules) |
| `Admin` | (untouched — global short-circuit via `is_admin()`) | | | |

Other legacy roles keep their current grants. Per-user adjustments continue
to flow through `user_permission_overrides` — no parallel path was added.

---

## 4. Route protection

`src/pages/compliance/ComplianceRouteGate.tsx` is the single entry point.
It maps every `/compliance/*` path to its `app_modules.name` (longest-prefix
match) and forwards to the existing `<PermissionProtectedRoute>` component:

```
useLocation() → resolveModuleForPath() → <PermissionProtectedRoute moduleName=...>
                                              ↓
                                  useCanAccessModule(moduleName)
                                              ↓
                                  get_user_permissions(_user_id) RPC
                                              ↓
                          allow / <Navigate to="/unauthorized" />
```

All 202 routes in `src/pages/compliance/Routes.tsx` are now wrapped via
`<ComplianceRouteGate>{element}</ComplianceRouteGate>`. The Admin bypass
(handled inside `useCanAccessModule`) is preserved.

**Adding a new Compliance route** requires (in this order):

1. Seed the module + actions in `app_modules` / `module_actions` via a
   migration.
2. Grant the action(s) to the relevant Compliance role(s) in
   `role_permissions`.
3. Add the constant in `MODULE_NAMES` (`src/hooks/useActionPermission.ts`).
4. Add the path → module entry in `ROUTE_MODULE_MAP` inside
   `ComplianceRouteGate.tsx`.
5. Inside the page, also call `useActionPermissions(MODULE_NAMES.CE_X)` and
   gate write buttons with `can(ACTION_NAMES.CREATE | EDIT | …)`.

---

## 5. Menu protection

Compliance is delivered through the DB-driven sidebar
(`useDynamicNavigation` → `app_modules` + `get_user_permissions`). A module
is visible only when both:

- `app_modules.is_enabled && show_in_menu`, **and**
- The user has the `view` action on that module (or is Admin).

Because the migration in §3 seeds `view` on every Compliance module **and
grants it only to the three Compliance roles** (plus Admin), the existing
sidebar machinery now hides Compliance from any user without a Compliance
role grant — no new menu code required.

The static `complianceMenuItems.ts` fallback is intentionally **not** added
to the aggregator (matches the inventory note); the DB-driven path is the
sole source of truth.

---

## 6. Sensitive action / button protection

The canonical pattern (used by Master Data and Internal Audit) is reused
unchanged:

```tsx
import { PermissionButton } from '@/components/ui/permission-button';
import { MODULE_NAMES, ACTION_NAMES } from '@/hooks/useActionPermission';

<PermissionButton
  moduleName={MODULE_NAMES.CE_NOTICES}
  actionName={ACTION_NAMES.APPROVE}
  onClick={handleApprove}
>
  Approve Notice
</PermissionButton>
```

Screens that need finer-grained branching read the booleans from
`useActionPermissions(MODULE_NAMES.CE_X)`:

```tsx
const { can, canView } = useActionPermissions(MODULE_NAMES.CE_PENALTY_MGMT);
if (!canView()) return <AccessDenied />;
{can(ACTION_NAMES.WAIVE) && <Button onClick={openWaiverDialog}>Waive</Button>}
```

Compliance shortcuts (`useComplianceRole`, `useHasCapability`) remain in
place as **read-only helpers** for UI hints; they do not gate writes.

---

## 7. Workflow & automation actions

- Approve / reject / submit / close / reopen / escalate buttons remain wired
  through `useWorkflowActions` and the existing workflow engine
  (`workflow_definitions` + `workflow_steps` + per-step roles). The action
  is shown when (workflow says the user is the assignee or in the assigned
  role) **AND** `can(ACTION_NAMES.APPROVE | REJECT | …)` returns true.
- Automation runs (`ce_admin_automation`, `ce_employer_jobs`, `ce_job_config`,
  `ce_c3_ledger_sync`) require the `run` action, granted only to
  `ComplianceHead` (and Admin).
- Simulators (`ce_rule_simulator`, `ce_risk_simulator`) require the `run`
  action; visible to all three Compliance roles for read-only what-if work,
  with `run` granted to `ComplianceHead`.

---

## 8. Reports / exports

Reports (`compliance_reports`, `ce_all_reports`, `ce_reports_automation_jobs`,
`ce_trend_reports`, et al.) get a `view` action and an `export` action.
Export buttons must be wrapped with `<PermissionButton actionName="export">`.

---

## 9. Admin configuration screens

Every admin/configuration module (`ce_admin_*`, `compliance_settings_page`,
`compliance_templates`, `ce_violation_types`, `ce_notice_templates`,
`ce_number_templates`, `ce_risk_scoring_config`, `ce_geography`, etc.) gets
`view` + `configure` + `run` (where applicable). `configure` and `run` are
granted exclusively to `ComplianceHead` and `Admin`.

---

## 10. Acceptance checklist

- ✅ Existing permission tables, constants, hooks, guards, and route
  protection patterns are reused — no parallel system.
- ✅ Naming convention (`snake_case`, `ce_*` prefix, controlled action
  vocabulary) is followed.
- ✅ New Compliance permissions seeded via the standard
  `module_actions` + `role_permissions` migration path.
- ✅ All Compliance routes protected through `<ComplianceRouteGate>` →
  existing `PermissionProtectedRoute`.
- ✅ All Compliance menu items protected by the existing DB-driven sidebar
  + the seeded `view` actions.
- ✅ Sensitive action buttons use the existing `<PermissionButton>` with
  module + action keys.
- ✅ Admin configuration screens require `configure` (and `run` where
  relevant).
- ✅ Report/export actions require `export`.
- ✅ Workflow actions check both workflow assignment and
  `can(approve / reject / …)`.
- ✅ Automation run actions require `run`.
- ✅ No hard-coded role-name comparisons introduced (`useComplianceRole`
  remains read-only UI helper).
- ✅ RLS not introduced — project standard role-based control is preserved.
- ✅ Documentation updated (this file + cross-reference from the
  inventory).
