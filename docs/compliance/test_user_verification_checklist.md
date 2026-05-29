# Compliance & Enforcement — UAT Test User Verification Checklist

For each user: log in → set new password → walk the steps below. Every "must NOT see" item that appears is a defect.

## Pre-flight (one-time, by tester lead)

- [ ] `COMPLIANCE_UAT_TEMP_PASSWORD` set in Lovable Cloud → Secrets.
- [ ] Edge function `seed-compliance-uat-users` invoked successfully (HTTP 200).
- [ ] All 9 users visible in **Admin → Users**, each with the expected role.
- [ ] `grep -RInE "role_name\s*===\s*'(Compliance|Admin|ReadOnly)" src/` returns no business-logic hits — only `useActionPermissions` / `PermissionWrapper` gating remains.

## 1. Compliance Admin (`mipl.student+compliance.admin@gmail.com` → `ComplianceAdmin`)
- [ ] Sees every Compliance & Enforcement menu, including **Compliance Setup** (rule engine, feature toggles, workflow mapping, automation jobs, templates, risk scoring, payment rules, legal handoff rules).
- [ ] Can configure / run / approve / reject / escalate within Compliance modules as required.
- [ ] Can export Compliance reports.
- [ ] **Must NOT** see top-level Administration (User & Role management, system-wide settings) or any non-Compliance module — this user is NOT the global Admin.
- [ ] `user_roles` row shows `ComplianceAdmin` only — no `Admin` row.

## 2. Compliance Manager (`mipl.student+compliance.manager@gmail.com` → `ComplianceHead`)
- [ ] Manager dashboard loads. Approvals queue accessible.
- [ ] **Administration** menu hidden; direct nav to `/compliance/admin/*` redirects to Unauthorized.

## 3. Compliance Officer (`mipl.student+compliance.officer@gmail.com` → `ComplianceInspector`)
- [ ] Violations, Cases, Notices, Arrangements (view), Inspections all accessible.
- [ ] No Administration, no Legal approve/reject buttons.

## 4. Compliance Supervisor (`mipl.student+compliance.supervisor@gmail.com` → `SeniorInspector`)
- [ ] Weekly plan approval works. Sees supervisor inbox.

## 5. Field Inspector (`mipl.student+field.inspector@gmail.com` → `ComplianceInspector`)
- [ ] Field execution, evidence upload, findings entry all accessible.

## 6. Finance User (`mipl.student+finance@gmail.com` → `ComplianceFinanceUser`)
- [ ] Dashboard + My Work Queue visible.
- [ ] **Payment Arrangements** menu visible: All / New / Pending / Active are **view-only** (no "Create new arrangement" button on `/compliance/arrangements`).
- [ ] Installments Due, Breaches, Breach Monitoring, Payment Allocation: can edit and submit.
- [ ] Reports menu visible; export buttons enabled on Arrears, Recovery, Payment Arrangement reports.
- [ ] **Must NOT see / must be denied:** Administration, Rule Engine, Legal Escalations, Inspections, Violations, Cases, Notices.
- [ ] No `approve` / `reject` button anywhere.

## 7. Legal User (`mipl.student+legal@gmail.com` → `ComplianceLegalOfficer`)
- [ ] Dashboard + My Work Queue + Legal Dashboard visible.
- [ ] **Legal Escalations** menu: Review Queue, Recommendation Queue, Pack Preparation, Approved, Returned, Status Tracking, Proceedings all open.
- [ ] Can add legal notes, update legal status, submit legal returns.
- [ ] Approve / reject / escalate buttons appear **only** inside Legal workflow steps.
- [ ] Reports menu: can view + export legal-related reports.
- [ ] **Must NOT see / must be denied:** Administration, Rule Engine, Payment Arrangements, Inspections, Violations create/edit. Direct nav to `/compliance/admin/*`, `/compliance/arrangements/new`, `/compliance/field/*` redirects to Unauthorized.
- [ ] No approve button on `ce_cases_closure` (general case closure).

## 8. Reports Viewer (`mipl.student+reports.viewer@gmail.com` → `ComplianceReportsViewer`)
- [ ] All dashboards open in read-only mode.
- [ ] Reports listed; export works.
- [ ] No create / edit / approve / submit buttons anywhere.

## 9. Restricted User (`mipl.student+restricted@gmail.com` → `ReadOnly`)
- [ ] No Compliance menu items visible.
- [ ] Direct nav to `/compliance/*` redirects to Unauthorized.

## Cross-cutting checks
- [ ] `ComplianceRouteGate` denies blocked routes for every applicable user.
- [ ] Workflow approve/reject buttons honour `useActionPermissions`.
- [ ] No console errors during gating decisions.
