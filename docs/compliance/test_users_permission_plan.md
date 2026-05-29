# Compliance & Enforcement — UAT Test Users Permission Plan

**Status:** Approved (final, with Finance/Legal corrections).  
**Scope:** Manual acceptance testing of the Compliance & Enforcement module only. No production users, no parallel access-control system, no hardcoded role checks, no menu/route/module changes.

## 1. Existing access-control model (reuse only)

- `auth.users` — Supabase Auth identities.
- `public.profiles` — 1:1 with `auth.users.id` (FK on cascade delete); carries `user_code`, `full_name`, `email`, `is_active`, `force_password_change`.
- `public.roles` — canonical role catalogue; `role_name` is unique business key.
- `public.user_roles (user_id, role)` — many-to-many; `role` is the text `role_name` (validated by trigger `validate_user_role` against `public.roles`).
- `public.app_modules` — module catalogue (`ce_*`).
- `public.module_actions` — per-module action verbs (`view`, `create`, `edit`, `submit`, `approve`, `reject`, `escalate`, `export`, `configure`, `run`, …).
- `public.role_permissions (role_id, module_id, action_id, is_granted)` — unique tuple; `protect_admin_permissions` trigger guards the `Admin` row.
- Resolution flow: `useActionPermissions(<module>).can(<action>)` → `get_user_permissions` RPC → `role_permissions` ∪ `user_permission_overrides`.
- Gating: `ComplianceRouteGate`, `PermissionWrapper`, `useActionPermissions`. **No code change** to any of these.

## 2. Test users (9)

| # | Email | Role assigned (`roles.role_name`) | Purpose |
|---|---|---|---|
| 1 | `mipl.student+compliance.admin@gmail.com` | `Admin` | Full access, configuration |
| 2 | `mipl.student+compliance.manager@gmail.com` | `ComplianceHead` | Manager dashboards, approvals |
| 3 | `mipl.student+compliance.officer@gmail.com` | `ComplianceInspector` | Day-to-day officer flows |
| 4 | `mipl.student+compliance.supervisor@gmail.com` | `SeniorInspector` | Plan approval, supervisor inbox |
| 5 | `mipl.student+field.inspector@gmail.com` | `ComplianceInspector` | Field execution, evidence, findings |
| 6 | `mipl.student+finance@gmail.com` | `ComplianceFinanceUser` | Payment allocation, breach review, arrears reports |
| 7 | `mipl.student+legal@gmail.com` | `ComplianceLegalOfficer` | Legal queue, pack prep, legal status |
| 8 | `mipl.student+reports.viewer@gmail.com` | `ComplianceReportsViewer` | Read-only dashboards and report export |
| 9 | `mipl.student+restricted@gmail.com` | `ReadOnly` | Negative-path: denied screens redirect |

`mipl.student+*@gmail.com` aliasing keeps every UAT mailbox in one Gmail inbox without polluting the auth namespace.

## 3. Roles

### 3.1 Reused (no change)
`Admin`, `ComplianceHead`, `SeniorInspector`, `ComplianceInspector`, `ReadOnly`.  
The seed migration must not modify these rows or their existing `role_permissions`.

### 3.2 New (additive only)
- `ComplianceFinanceUser` — Finance officer reconciling Compliance arrangements.
- `ComplianceLegalOfficer` — Legal officer handling Compliance escalations.
- `ComplianceReportsViewer` — Read/export-only across Compliance dashboards and reports.

All three are added with `is_active = true`, `is_system_role = false`, `mfa_required = false`. Inserted with `ON CONFLICT (role_name) DO NOTHING`.

## 4. Permission matrix for new roles

Only existing `app_modules` and existing `module_actions` are referenced — no new modules, no new actions.

### 4.1 ComplianceFinanceUser (corrected — narrow)

| Module | view | edit | submit | export |
|---|:-:|:-:|:-:|:-:|
| `ce_dashboards`, `ce_my_work_queue` | ✅ | | | |
| `ce_payment_arrangements`, `ce_arr_all`, `ce_arr_new`, `ce_arr_pending`, `ce_arr_active` | ✅ | | | |
| `ce_arr_installments_due` | ✅ | ✅ | ✅ | |
| `ce_arr_breaches`, `ce_breach_monitoring` | ✅ | ✅ | ✅ | |
| `ce_arr_payment_alloc` | ✅ | ✅ | ✅ | |
| `compliance_reports`, `ce_all_reports`, `ce_reports_automation_jobs` | ✅ | | | ✅ |

Explicit denials (no grant emitted):
- No `create` on `ce_arr_new` or any other arrangement register. `/arrangements/new` is a Compliance-owned create flow (see `src/pages/compliance/arrangements/NewArrangementPage.tsx`); Finance receives view-only there.
- No `approve` / `reject` / `escalate` on any module.
- No `ce_admin_*` (Setup) grants.
- No `ce_admin_calc_rules`, `ce_admin_arr_rules`, `ce_admin_escalation_rules`, or any rule-engine module.
- No `ce_legal_*` grants.
- No `ce_field_*` / `ce_insp_*` (inspection execution) grants.

### 4.2 ComplianceLegalOfficer (corrected — narrow)

| Module | view | create | edit | submit | approve | reject | escalate | export |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `ce_dashboards`, `ce_my_work_queue`, `ce_legal_dashboard` | ✅ | | | | | | | |
| `ce_legal_queue`, `ce_legal_review_queue`, `ce_legal_recommendation_queue`, `ce_legal_pack_prep`, `ce_legal_status_tracking` | ✅ | | ✅ | ✅ | | | | |
| `ce_legal_approved`, `ce_legal_returned`, `ce_legal_escalations`, `ce_legal_proceedings` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |
| `compliance_reports`, `ce_all_reports` | ✅ | | | | | | | ✅ |

Explicit denials (no grant emitted):
- `approve` / `reject` / `escalate` are granted **only on `ce_legal_*` modules** — never on `ce_cases*`, `ce_violations*`, `ce_arr*`, `ce_field_*`, or `ce_admin_*`. Because every approve/reject in the UI flows through `useActionPermissions(<module>).can('approve')`, this confines Legal approvals to the legal-escalation workflow.
- No `ce_arr_*` / payment allocation grants.
- No `ce_field_*` / `ce_insp_*` grants.
- No `ce_admin_*` (Setup) grants.
- No rule-engine grants.
- No general case-closure approval (`ce_cases_closure.approve`) — closure approval stays with Compliance roles unless an existing legal-handoff workflow explicitly routes it back to Legal.

### 4.3 ComplianceReportsViewer

| Module | view | export |
|---|:-:|:-:|
| `ce_dashboards`, `ce_analytics_dashboard`, `ce_manager_dashboard`, `ce_inspector_dashboard`, `ce_legal_dashboard` | ✅ | |
| `compliance_reports`, `ce_all_reports`, `ce_reports_automation_jobs` | ✅ | ✅ |

No other grants.

## 5. Module access matrix (top-level menus)

| Menu group | Admin | Manager | Officer | Supervisor | Field Insp. | Finance | Legal | Reports | Restricted |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| My Work Queue | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Violations | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| Cases | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — |
| Notices | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — |
| Payment Arrangements | ✅ | ✅ | ✅ | — | — | ✅ (narrow) | — | — | — |
| Inspections | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| Legal Escalations | ✅ | ✅ | — | — | — | — | ✅ | — | — |
| Risk & Employer Profile | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| Reports | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| Administration | ✅ | — | — | — | — | — | — | — | — |

## 6. Password strategy (no value committed)

- Single env secret `COMPLIANCE_UAT_TEMP_PASSWORD` is read by the edge function at invocation time.
- The seed function fails with HTTP 400 if the secret is unset or shorter than 8 chars.
- All 9 test users are provisioned with the same throwaway password and `force_password_change = true`. Each tester resets at first login.
- The secret value is **never** logged or echoed in responses. No password value lives in the repo.

## 7. Production safety

- The function refuses to run when the Supabase host is identified as Live unless **both** of the following hold:
  - env `COMPLIANCE_UAT_ALLOW_PROD=true`
  - request body `{"confirm_production": true}`
- Default invocation in Test is unrestricted.

## 8. Idempotency

For each email the seeder:
1. Paginates `auth.admin.listUsers` to locate the user; creates with `email_confirm: true` if missing, otherwise updates the password and metadata via `updateUserById`.
2. Upserts `public.profiles` keyed by `id`, setting `email`, `full_name`, `user_code`, `is_active = true`, `force_password_change = true`.
3. Upserts `public.user_roles (user_id, role)` (unique constraint already exists).
4. Best-effort writes a row to `user_provisioning_logs` if the table exists (ignored on failure).

Re-running the function is safe and produces no duplicates.

## 9. Files in scope

- `docs/compliance/test_users_permission_plan.md` (this file)
- `docs/compliance/test_user_verification_checklist.md`
- `docs/compliance/test_user_credentials.local.md` (no password value)
- `supabase/functions/seed-compliance-uat-users/index.ts`
- One additive migration: 3 new role rows + their `role_permissions`.

## 10. Acceptance criteria

- No password value committed.
- No existing roles, grants, modules, actions, routes, menus, or users modified.
- Finance role has no create-arrangement, no approve, no Setup, no rule-engine, no legal, no inspection.
- Legal role has no approve/reject/escalate outside `ce_legal_*`, no payment, no Setup, no rule-engine, no inspection.
- Existing `ComplianceRouteGate` / `PermissionWrapper` / `useActionPermissions` remain the only gating path.
- Seed is fully idempotent and production-safe.
