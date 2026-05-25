# Compliance & Enforcement — Access-Control Inventory

Generated: 2026-05-25. **Read-only audit. No functional code changed.**
Purpose: document the *existing* access-control architecture so all future
Compliance work plugs into it instead of creating a parallel system.

---

## 1. User model

| Concern | Implementation |
|---|---|
| Auth provider | Supabase Auth (`auth.users`) via `@/integrations/supabase/client` |
| App-level profile | `public.profiles` (FK to `auth.users.id`); columns include `full_name`, `email`, `is_active`, `force_password_change`, `mfa_enabled`, `failed_login_attempts`, `locked_until`, `last_login`, **`user_code` (VARCHAR(50)) — canonical audit identifier** |
| Loader | `SupabaseAuthProvider` (`src/contexts/SupabaseAuthContext.tsx`, 833 lines) → fetches session, then loads `profile` and `roles` in parallel; exposes `useSupabaseAuth()` |
| Readiness flags | `isAuthReady`, `isAuthenticated`, `isLoading`, `profileStatus`, `rolesStatus`, `authBootstrapStatus` (`loading|ready|degraded`) |
| Staff / org linkage | `tb_office`, `tb_office_departments`, `tb_designations`, `designation_hierarchy`, `role_hierarchy`, `office_ip_addresses`, `office_locations`. Compliance-specific: `ce_inspectors` (FK to user via `user_code`), `ce_zone_office_mapping`, `ce_village_zone_mapping`, `ce_queue_members` |
| Per-user overrides | `user_permission_overrides` (allow/deny at module+action level); `user_data_overrides` (row/field overrides — surfaced via `useDataAccessPolicy`) |

**Rule:** for any audit/createdby/updatedby field, store `profile.user_code` (per core memory).

---

## 2. Role model

| Concern | Implementation |
|---|---|
| Role catalog | `public.roles` — `role_name`, `description`, `is_active`, `is_system_role`, `mfa_required` |
| User → role mapping | `public.user_roles` — **multi-role per user** (composite `user_id` + `role`) |
| Role hierarchy | `public.role_hierarchy` (parent/child roles for cascading) |
| Designation hierarchy | `public.designation_hierarchy` (separate axis, used for reporting-manager / workflow approver resolution — memory `Reporting Manager Resolution`) |
| External role mapping | `external_api_role_mapping` (for satellite/SSO portals) |
| Scope of a role | **Global** (not module-bound, not office-bound). Office/department/zone limits are applied via **row-level helpers** (see §8), not separate roles. |
| Admin sentinel | role name **exactly `Admin`** — short-circuits every permission check via `is_admin(_user_id)` RPC |

Compliance-specific operational roles already used in code (case-insensitive
substring match in `useComplianceRole.ts`): `ComplianceInspector`,
`SeniorInspector`, `ComplianceHead`. These are **regular `roles.role_name` rows**,
not a parallel role system.

---

## 3. Permission model

| Layer | Table / Constant |
|---|---|
| Modules (menu nodes) | `public.app_modules` — `name`, `display_name`, `route`, `parent_id`, `sort_order`, `is_enabled`, `show_in_menu`, `rollout_state`, `internal_only`, `pilot_user_ids`, `pilot_role_ids`, `routes_enabled`, `actions_enabled`, `primary_table`, `primary_key_column` |
| Actions per module | `public.module_actions` — `module_id`, `action_name`, `display_name`, `is_enabled` |
| Role → permission grants | `public.role_permissions` — (`role_id`, `module_id`, `action_id`, `is_granted`) |
| User override | `public.user_permission_overrides` — (`user_id`, `module_id`, `action_id`, `is_granted`, `override_reason`) |
| Constants (frontend) | `MODULE_NAMES`, `ACTION_NAMES` in `src/hooks/useActionPermission.ts` |
| Legacy enum | `Permission` union in `src/types/auth.ts` (string literals like `manage_compliance`, `conduct_inspections`, etc.) — **superseded by `module + action`, kept for legacy menu gates and `ProtectedRoute.requiredPermission`** |

**Naming convention (current data):**

- Module names: `snake_case`, often prefixed by domain (`ce_*` for Compliance,
  `ia_*` for Internal Audit, `bn_*` for Benefits, `md_*` for Master Data,
  `cn_*` for Cashier/Counter). Compliance also has legacy non-prefixed names:
  `compliance_dashboard`, `compliance_notices`, `compliance_reports`,
  `compliance_settings`, `compliance_templates`, `compliance_tools`,
  `manual_violation_entry`, `all_violations`, `legal_escalation_policy`.
- Action names: lowercase verbs / `kebab-case` qualifiers. Canonical set
  observed: `view`, `create`, `edit`, `delete`, `disable`, `export`,
  `submit`, plus role-mgmt specific actions (`create-role`, `clone-role`,
  `configure-permissions`, `add-actions`, `enable-disable`, `save-policy`,
  `view-log`, `view-logs`, `view-analytics`, `manage-roles`, `disable-user`,
  `export-csv`, etc.). Compliance modules today **only have `view`** seeded.

**Assignment direction:** Permissions are granted **to roles**, then users
inherit through `user_roles`. Per-user `user_permission_overrides` can add or
revoke individual (module, action) pairs. **No** permissions are attached to
designations, offices, or groups.

### Server-side resolvers (canonical entry points)

```sql
public.is_admin(_user_id uuid) RETURNS bool                    -- shortcut
public.has_permission(_user_id, _module_name, _action_name)    -- single check
public.get_user_permissions(_user_id)                          -- bulk list
public.check_row_access(_user_id, _module_name, _table_name, _action)
public.get_visible_fields(_user_id, _module_name, _table_name)
```

All are `SECURITY DEFINER` with `SET search_path=public`. Admin bypasses every
check. Lookups join `user_roles → roles → role_permissions → module_actions →
app_modules` with `is_enabled` and `is_granted` filters.

---

## 4. Menu access model

The sidebar is **DB-driven** through `app_modules` (per core memory
`Sidebar Navigation`), with **static fallbacks** for legacy menus.

| Surface | Source |
|---|---|
| Dynamic sidebar | `DynamicSidebarContent.tsx` → `useDynamicNavigation` / `useNavigationMenu` (`src/hooks/useNavigationMenu.ts`) — reads `app_modules` + `get_user_permissions` RPC, then renders modules where the user has at least the `view` action |
| Static fallback | `src/components/sidebar/sidebarMenuItems.ts` aggregates `userMenuItems`, `masterDataMenuItems`, `bnMenuItems`, `systemAdminMenuItems`. **`complianceMenuItems.ts` is defined but NOT in the aggregator** — Compliance enters the sidebar exclusively through the DB-driven path. |
| Item filter (static path) | Each entry carries `requiresPermission: '<legacy_permission_string>'` checked against `useSupabaseAuth().hasPermission` (legacy enum) or role |
| Item filter (dynamic path) | A module renders iff `app_modules.is_enabled && show_in_menu` AND the user's `get_user_permissions` set contains `(module.name, 'view')` (or user is Admin) |
| Rollout gates | `rollout_state` (`public|pilot|internal`), `internal_only`, `pilot_user_ids`, `pilot_role_ids` on `app_modules` |
| Satellite routing | `applyComplianceRemoteRouting` (`src/lib/embed/satelliteRouting.ts`) rewrites compliance URLs for embedded shells |

**Compliance menu state today:** ~60 `ce_*` and `compliance_*` modules exist in
`app_modules`; only ~25 have a `view` action seeded; the rest (e.g.
`ce_admin_automation`, `ce_geography`, `ce_employers`, `ce_enforcement`)
have **no actions at all** → invisible to non-admins.

---

## 5. Route protection model

| Component | File | Behavior |
|---|---|---|
| `ProtectedRoute` | `src/components/auth/ProtectedRoute.tsx` | Wraps any auth-required route. Waits for `isAuthReady && !isLoading`, redirects unauth → `/login`. Accepts an optional `requiredPermission` prop (legacy enum) — **currently not enforced inside the component** (TODO inherited from legacy code); the actual gate is the sidebar + screen-level check. |
| Route registry | `src/components/routing/AppRoutes.tsx` (+ `PublicRoutes.tsx`) | Lazy-loads pages and wraps protected branches in `<ProtectedRoute>`. Compliance pages are mounted under `/compliance/*` through `src/pages/compliance/Routes.tsx`. |
| Unauthorized page | `src/pages/Unauthorized.tsx` | Surface used by screens that detect missing permission |
| IP block / maintenance | `src/pages/IPBlocked.tsx`, `src/pages/Maintenance.tsx` (memory `IP Access Control`, `Session Standards`) |

Protection is therefore **centralized for auth** (`ProtectedRoute`) but
**screen-level for fine-grained permissions** (each page calls
`useActionPermissions(MODULE)` and renders `<Unauthorized />` or hides UI on
`!canView()`). Per core memory: every protected query must wait for
`isAuthReady && isAuthenticated`.

---

## 6. Action-level permission checks

The canonical pattern (used across Master Data, Internal Audit, Workflow,
Notifications, Sample Application, Office/Department mgmt):

```tsx
import { useActionPermissions, MODULE_NAMES, ACTION_NAMES } from '@/hooks/useActionPermission';

const { can, canView, isLoading, isAdmin } = useActionPermissions(MODULE_NAMES.MD_INSPECTOR);

if (!canView()) return <Unauthorized />;

{can(ACTION_NAMES.CREATE) && <Button onClick={onAdd}>Add</Button>}
{can(ACTION_NAMES.EDIT)   && <Button onClick={onEdit}>Edit</Button>}
{can(ACTION_NAMES.DELETE) && <Button variant="destructive" onClick={onDel}>Delete</Button>}
{can(ACTION_NAMES.EXPORT) && <Button onClick={onExport}>Export</Button>}
```

For one-off async checks, the context method works too:
```ts
const allowed = await hasPermission('ce_cases', 'edit');
```

Compliance-specific shortcuts already in repo:

- `useComplianceRole()` → `'inspector' | 'senior' | 'head' | 'other'` derived
  from `auth.roles`.
- `useHasCapability(cap)` (`src/hooks/useHasCapability.ts`) → uses
  `ROLE_CAPABILITIES` bundle in `src/lib/compliance/capabilities.ts`; falls
  back to legacy `manage_compliance` permission and to `Admin` role.
  **These wrap, not replace, the canonical `useActionPermissions` system.**

---

## 7. Workflow and task access

| Concern | Implementation |
|---|---|
| Engine | Generic workflow engine over `workflow_definitions`, `workflow_instances`, `workflow_step_actions`, `workflow_action_*` tables |
| Action discovery | `useWorkflowActions(workflowId, recordId)` (`src/hooks/useWorkflowActions.ts`) returns `{ workflowStatus, actions, canPerformActions }` |
| Permission gate | Inside that hook: `checkUserPermissionOptimized(...)` resolves the user's eligibility against `workflow_role_assignments` AND `workflow_step_actions.required_permission` (if any). Assignment alone is **not** sufficient — the user must also satisfy the step's permission requirement. |
| Maker–Checker | Per memory `Workflow Maker-Checker Enforcement` and `workflow_definitions.maker_checker_enabled`: creator/submitter is blocked at both UI (`canPerformActions=false`) and backend (`useExecuteWorkflowAction` writes `system_audit_trail` action `maker_checker_blocked`). Admin is exempt. |
| Role assignment resolution | `workflow_role_assignments` + dynamic resolvers (manager hierarchy via `designation_hierarchy`, memory `Reporting Manager Resolution`) |
| Notifications | DB-driven `workflow_step_notifications` (memory `Notification Engine`) |
| Side-effect safety | Complete task only after side-effects succeed (memory `Workflow Task Safety`) |

**Implication for Compliance:** Any compliance approval (weekly plan review,
waiver, legal referral, payment-arrangement approval, notice issuance) must
register a `workflow_definitions` row and rely on this engine. **Do not add
custom approval tables or bespoke action gates.**

---

## 8. Data access & row-level security

| Layer | Status |
|---|---|
| RLS posture | Mostly **disabled** across business tables (memory `RLS Policy`). Financial/audit tables (`cn_*` cashier ledger, some `bn_*` benefit payment tables, `system_audit_trail`) retain RLS. **Verify before disabling/enabling on any compliance write path.** |
| Row gating | Application-level via `useRowAccess(table, action)` → `check_row_access` RPC |
| Field masking | `useFieldVisibility(table, module)` → `get_visible_fields` RPC, then `maskFieldValue(value, 'none'|'partial'|'full')` |
| Org/office scoping | Not enforced in DB. Code-level filters use `tb_office`, `office_ip_addresses` (cashier auto-detect), `ce_zone_office_mapping`, `ce_inspectors.office_id`, `ce_queue_members` |
| PII masking | Required globally (core memory). Use `maskFieldValue` or `PIIMaskingContext` (`src/contexts/PIIMaskingContext.tsx`) |
| Audit trail | Global `system_audit_trail` for cross-module events (memory `Audit Trail System`); compliance-specific `ce_audit_log` for inspector-audit lifecycle |

Net: enforcement is **both** (frontend gates + a few server functions via
`SECURITY DEFINER`), but **defense in depth** at the DB layer is incomplete —
treat the frontend gate as primary and add server-side validation in edge
functions / RPCs whenever a write spans multiple tables.

---

## 9. Existing Compliance permissions (data dump)

### 9.1 `app_modules` rows (Compliance namespace)

**With `view` action seeded (visible to gated users):**
`all_violations`, `audit_completion_rate`, `ce_all_reports`,
`ce_analytics_dashboard`, `ce_assignment_queues`, `ce_breach_monitoring`,
`ce_case_management`, `ce_case_queue`, `ce_cases`, `ce_dashboards`,
`ce_employer_statements`, `ce_field`, `ce_field_audit_mgmt`,
`ce_field_employer_360`, `ce_field_employer_grp`, `ce_field_execution`,
`ce_field_findings_grp`, `ce_field_my_upcoming`, `ce_field_operations`,
`ce_field_plans`, `ce_field_visits`, `ce_field_weekly_report_review`,
`ce_field_weekly_report_submit`, `ce_inspection_mgmt`, `ce_inspections`,
`ce_inspector_dashboard`, `ce_job_config`, `ce_job_history`,
`ce_legal_dashboard`, `ce_legal_proceedings`, `ce_legal_queue`,
`ce_legal_recommendation_queue`, `ce_manager_dashboard`, `ce_monitoring`,
`ce_monthly_candidates`, `ce_number_templates`, `ce_penalty_mgmt`,
`ce_reassignment`, `ce_review_queue`, `ce_risk_profiles`,
`ce_risk_scoring_config`, `ce_risk_simulator`, `compliance_audit`,
`compliance_dashboard`, `compliance_notices`, `compliance_rate_by_zone`,
`compliance_reports`, `compliance_settings`, `compliance_settings_page`,
`compliance_templates`, `compliance_tools`, `compliance_trends_12m`,
`compliance_rate_by_zone`, `inspection_coverage_zone`,
`audit_inspection_reports`, `c3_compliance_reports`, `inspector_performance`,
`judgements_enforcement`, `legal_escalation_policy`,
`legal_escalation_reports`, `legal_recommendation_queue`,
`legal_stage_distribution`, `manual_violation_entry`.

**With NO actions seeded (effectively admin-only today):**
`ce_admin_automation`, `ce_admin_integrations`, `ce_assignment_routing`,
`ce_audit_comm_templates`, `ce_c3_ledger_sync`, `ce_document_foundation`,
`ce_employer_hierarchy`, `ce_employer_interaction`, `ce_employer_jobs`,
`ce_employer_mgmt`, `ce_employers`, `ce_enforcement`, `ce_field_approval_inbox`,
`ce_field_plan_builder_v3`, `ce_field_plan_revisions`, `ce_geography`,
`compliance_audit_db_diagram`. **← These are the immediate gaps.**

### 9.2 Sidebar guards in `complianceMenuItems.ts`

Uses **legacy permission strings**: `manage_compliance`,
`conduct_inspections`, `create_weekly_plan`, `approve_weekly_plan`,
`generate_reports`, `view_financial_data`. (Not module/action keys.) Because
this file is not in the static aggregator, these gates only fire if Compliance
ever gets surfaced through the static path.

### 9.3 Action guards in compliance screens

Today, most compliance pages render unconditionally once auth resolves;
gating is via the legacy `manage_compliance` permission and the role-based
`useHasCapability` helper. **No screen yet calls `useActionPermissions('ce_*')`
with `can('create'|'edit'|'delete'|'export'|'submit'|'approve')`** — this is
the primary action-gating gap to close.

### 9.4 Missing permissions (high level)

1. **No write actions** (`create / edit / delete / submit / approve / export /
   issue / waive / escalate / reassign / close / reopen`) are defined for any
   `ce_*` module — only `view`.
2. Several modules have **no actions at all** (list in §9.1 second block) →
   not even discoverable to non-admins via `get_user_permissions`.
3. Admin/configuration screens (Rule Engine, Violation Types, Number
   Templates, Risk Policy, Assignment Routing, Notice Templates, Communication
   Templates, Online Response Config, Document Foundation, Geography, Staff,
   Automation, Tools) lack `manage`/`edit`/`publish` actions.
4. Legacy non-prefixed modules (`compliance_settings`, `compliance_notices`,
   `compliance_reports`, `manual_violation_entry`, `all_violations`) duplicate
   the `ce_*` namespace → consolidate during permission seeding to avoid
   double maintenance.
5. No `Compliance*` role rows in `roles` are seeded with `role_permissions`
   bundles — `useComplianceRole` resolves the role name but
   `role_permissions` is empty, so the legacy `manage_compliance` flag is
   doing all the heavy lifting today.

---

## 10. Recommended Compliance permission map

**Rule:** reuse existing names and conventions. Do **not** invent new tables,
new gate hooks, or new role types.

### 10.1 Action vocabulary (use only these)

| Action | Use for |
|---|---|
| `view` | List/detail pages, dashboards, reports (already seeded) |
| `create` | New violation / case / notice / arrangement / waiver / inspection / plan item |
| `edit` | Update existing record (status, fields, assignment) |
| `delete` | Hard delete or void (rare; prefer status change) |
| `submit` | Submit weekly plan, weekly report, response, online submission |
| `approve` | Approve plan, report, waiver, payment arrangement, legal recommendation |
| `reject` | Counterpart of approve |
| `assign` | Reassign violation/case/queue item |
| `close` | Close case, resolve violation |
| `reopen` | Reopen closed case/violation |
| `export` | CSV/PDF export from list or report |
| `issue` | Issue notice (post `submit/approve` chain) — domain-specific |
| `escalate` | Escalate to legal / next severity |
| `waive` | Apply waiver/override |
| `configure` | Admin settings save (rule engine, templates, policies) |
| `run` | Trigger automation job / dry run / force re-run |

`approve / reject / issue / waive / escalate / configure / run` are extensions
to the global `ACTION_NAMES`; add them to `src/hooks/useActionPermission.ts`
when first used so the constants stay the single source of truth.

### 10.2 Module → action grid (target seeding)

Drive these into `module_actions` + `role_permissions` via a migration when
implementation starts. Pattern: every operational `ce_*` module gets the
relevant subset.

| Module (`app_modules.name`) | Actions to seed |
|---|---|
| `ce_violations` / `all_violations` | view, create, edit, assign, close, reopen, export |
| `manual_violation_entry` | view, create, submit |
| `ce_case_management` / `ce_case_queue` / `ce_cases` | view, create, edit, assign, close, reopen, export |
| `ce_penalty_mgmt` | view, create, edit, waive, export |
| `compliance_notices` | view, create, edit, submit, approve, reject, issue, export |
| `ce_breach_monitoring` | view, edit, escalate, export |
| `ce_legal_queue` / `ce_legal_proceedings` / `ce_legal_recommendation_queue` | view, create, edit, approve, reject, escalate, close, export |
| `compliance_tools` / `ce_risk_simulator` / `ce_rule_simulator` | view, run |
| `ce_field_plans` / `ce_field_plan_builder_v3` | view, create, edit, submit |
| `ce_field_plan_revisions` / `ce_field_approval_inbox` | view, approve, reject |
| `ce_field_weekly_report_submit` | view, create, edit, submit |
| `ce_field_weekly_report_review` | view, approve, reject |
| `ce_field_visits` / `ce_field_execution` / `ce_field_operations` | view, create, edit, close |
| `ce_field_employer_360` / `ce_field_employer_grp` / `ce_field_findings_grp` | view, export |
| `ce_employer_statements` / `ce_employers` / `ce_employer_mgmt` / `ce_employer_hierarchy` | view, edit, export |
| `ce_assignment_queues` / `ce_review_queue` / `ce_reassignment` | view, assign, edit |
| `ce_inspection_mgmt` / `ce_inspections` | view, create, edit, close, export |
| `ce_risk_profiles` | view, run (recalc), export |
| `compliance_settings_page` / `compliance_templates` (Rule Engine) | view, configure |
| `ce_number_templates` / `ce_assignment_routing` / `ce_risk_scoring_config` | view, configure |
| `ce_audit_comm_templates` / `ce_document_foundation` | view, create, edit, delete, configure |
| `ce_admin_automation` / `ce_employer_jobs` / `ce_job_config` / `ce_job_history` | view, configure, run |
| `ce_c3_ledger_sync` / `ce_admin_integrations` | view, configure, run |
| `ce_geography` | view, create, edit, delete, configure |
| Reports (`compliance_reports`, `ce_all_reports`, `c3_compliance_reports`, `compliance_rate_by_zone`, `compliance_trends_12m`, `legal_escalation_reports`, `inspector_performance`, `audit_completion_rate`, `audit_inspection_reports`, `judgements_enforcement`, `legal_stage_distribution`, `inspection_coverage_zone`) | view, export |
| Dashboards (`ce_manager_dashboard`, `ce_inspector_dashboard`, `ce_legal_dashboard`, `ce_analytics_dashboard`, `ce_monitoring`, `compliance_dashboard`) | view |

### 10.3 Role → bundle mapping

Add `role_permissions` rows for these three system roles (already used by
`useComplianceRole`); keep the existing `Admin` shortcut untouched:

- **`ComplianceInspector`** — all `view`; `create/edit/submit/close` on field
  modules (`ce_field_*`, `ce_inspections`, `ce_violations`, `manual_violation_entry`);
  `view/export` on reports & employer 360.
- **`SeniorInspector`** — everything `ComplianceInspector` has, plus
  `approve/reject` on `ce_field_plan_revisions`,
  `ce_field_weekly_report_review`, `ce_field_approval_inbox`,
  `compliance_notices`; `assign` on queues; `waive` on `ce_penalty_mgmt`;
  `escalate` on legal modules.
- **`ComplianceHead`** — every action on every `ce_*` / `compliance_*` module
  (functional equivalent of Admin scoped to Compliance namespace).

Other roles (`compliance_officer`, `legal_officer`, `field_inspector` from
the legacy enum) keep their current grants until migrated.

### 10.4 Wiring rules for new screens

1. Define / add the module + actions via a Supabase migration into
   `app_modules` and `module_actions` (use INSERT ... ON CONFLICT DO NOTHING).
2. Add corresponding `role_permissions` rows for the three Compliance roles.
3. Add `MODULE_NAMES.CE_<X>` and any new `ACTION_NAMES.<Y>` constants to
   `src/hooks/useActionPermission.ts`.
4. In the screen: `const { can, canView } = useActionPermissions(MODULE_NAMES.CE_X);`
   Hide write buttons behind `can('create' | 'edit' | ...)`; render
   `<Unauthorized />` (or redirect) when `!canView()`.
5. For approval flows: bind via `workflow_definitions` and surface actions
   through `useWorkflowActions` — **do not** add inline approve/reject buttons
   that bypass the workflow engine.
6. For row scoping (office/zone/inspector ownership), call `useRowAccess` or
   pass `office_code` / `zone_id` filters at the query layer.
7. For field masking, call `useFieldVisibility` and apply `maskFieldValue`.

---

## 11. Implementation rules for all future Compliance prompts

These are **non-negotiable** for every subsequent Compliance task:

1. **Reuse the existing access-control system.** Permissions live in
   `app_modules` + `module_actions` + `role_permissions` (+ optional
   `user_permission_overrides`). Never introduce a parallel table.
2. **Use the canonical hooks:** `useSupabaseAuth`, `useActionPermissions`,
   `useRowAccess`, `useFieldVisibility`. Compliance-specific helpers
   (`useComplianceRole`, `useHasCapability`) are *wrappers* — keep them, do
   not extend them with new gates that bypass `useActionPermissions`.
3. **Permission keys follow existing naming** — module names in `snake_case`
   prefixed with `ce_`; actions from the controlled vocabulary in §10.1.
4. **Menu items come from `app_modules`.** Never add a static
   `complianceMenuItems` entry without a matching DB row.
5. **Routes** stay under `/compliance/*` and are wrapped by `ProtectedRoute`.
   Add a per-screen `useActionPermissions(...)` `canView()` check; redirect
   to `/unauthorized` when false.
6. **Approvals run through the generic workflow engine** (`workflow_definitions`
   + `useWorkflowActions`). Respect `maker_checker_enabled`. Never wire a
   bespoke approval button.
7. **Admin role bypass is automatic** at every layer — do not add explicit
   `if (isAdmin)` shortcuts in new screens; rely on `is_admin` and
   `useActionPermissions`'s built-in admin handling.
8. **Audit every state change** to `system_audit_trail` (compliance-specific
   inspector-audit events still go to `ce_audit_log`). Stamp `user_code`
   from the profile.
9. **Office/zone scoping** is application-level; resolve via existing tables
   (`tb_office`, `office_locations`, `ce_zone_office_mapping`,
   `ce_inspectors`). Do not introduce per-tenant RLS unless the data is
   financial/audit-grade.
10. **Every change ships docs:** update the matching file under
    `docs/compliance/**` and, when the access-control surface changes,
    update this inventory.

### Acceptance criteria met

- ✅ No functional Compliance code changed by this task (audit only).
- ✅ Existing permission architecture (User → Role → Module/Action +
  per-user overrides + workflow gate + row/field policy) is documented.
- ✅ Future Compliance implementation can follow the documented model
  end-to-end (module/action grid, role bundles, wiring rules).
