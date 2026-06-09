# BN Workbasket Multi-Role & Small Office Support

Reshape BN workbaskets so one person can cover many roles (small office) while large offices keep segregation of duties. Maker-checker stays enforced for high-risk actions.

## 1. Database (single migration)

### a. Workbasket → multiple roles
`bn_workbasket.assigned_role` (single text) stays as the **primary** role for backward compatibility. Add a join table for additional roles:

```
bn_workbasket_role (workbasket_id, role_name, is_primary, created_at)
```
Backfill: insert one row per existing workbasket with `is_primary=true`.

### b. Role bundle
Add seed role `BN_BENEFIT_OFFICER_GENERALIST` in `public.roles`, plus a `bn_role_bundle` + `bn_role_bundle_member` pair:

```
bn_role_bundle(code, name, description, is_active)
bn_role_bundle_member(bundle_code, role_name)
```
Seed `BN_BENEFIT_OFFICER_GENERALIST` → INTAKE, DOCUMENT, ELIGIBILITY, CALCULATION, CLAIMS officer roles (no approver / payment-approval / config roles).
Trigger on `user_roles` insert: when the role is a bundle code, expand into member roles automatically.

### c. Delegation
```
bn_role_delegation(
  id, from_user_id, to_user_id, role_name, workbasket_id NULL,
  valid_from date, valid_to date, reason text,
  status text CHECK in ('PENDING','APPROVED','REVOKED','EXPIRED'),
  approved_by uuid, approved_at, created_at, created_by
)
```

### d. Self-approval guard
Add columns to `bn_approval_policy` (already has `self_approval_allowed`):
- `restricted_action boolean default false` — marks high-risk policy areas
Seed/flag these areas as restricted: `ELIGIBILITY_OVERRIDE`, `CALCULATION_OVERRIDE`, `DOCUMENT_WAIVER`, `FINAL_CLAIM_APPROVAL`, `PAYMENT_RELEASE`.

DB function `bn_can_approve(p_user_id, p_policy_id, p_requester_user_id) returns boolean`:
- if `requester = user` and `self_approval_allowed=false` and `restricted_action=true` → false
- else if user holds `approval_role` (directly, via bundle, or via active delegation) → true.

### e. Helper view
`v_bn_user_effective_roles(user_id, role_name, source)` — unions direct user_roles, bundle expansion, and active delegations. Used by both UI and validator.

## 2. Services (TS)

- `workbasketRoleService.ts` — fetch baskets visible to a user via `v_bn_user_effective_roles` ⨝ `bn_workbasket_role`.
- `roleBundleService.ts` — list bundles, expand to member roles.
- `delegationService.ts` — CRUD + approve/revoke for `bn_role_delegation`.
- `approvalGuardService.ts` — wraps `bn_can_approve` RPC; called before any approval action.
- Update `bnRegistryValidationService.ts`:
  - PASS if a workbasket has ≥1 role AND ≥1 user (direct or via bundle/delegation) holds it.
  - PASS if approval policy has ≥1 eligible alternate approver when `self_approval_allowed=false`.
  - One user holding many roles is never an error.

## 3. UI

- **Workbasket Config** — multi-select role picker (primary + additional), powered by `useWorkflowRoles()`.
- **Role Bundles page** (`/bn/config/role-bundles`) — list bundles, show member roles, toggle active.
- **Delegations page** (`/bn/config/delegations`) — create/approve/revoke; shows active and upcoming.
- **My Workbench dashboard** (`/bn/workbench`) grouped sections:
  - My Assigned Tasks
  - My Role Workbaskets (one card per role the user holds)
  - Team Workbaskets (baskets in user's office not assigned to them)
  - Escalated Tasks
- **Approval action buttons** — disabled with tooltip "Self-approval not allowed for this action" when `approvalGuardService` returns false.
- **Approval Policy editor** — expose `restricted_action`, `self_approval_allowed`, `approval_role`, `escalation_role`, `min_level`.

## 4. Audit
Every approval, delegation create/approve/revoke, and self-approval block writes to `system_audit_trail` via the existing `fn_audit_row_change` trigger plus explicit service-level audit for guard denials.

## Technical notes
- No RLS (per project rule). Access enforced in service + RPC layer.
- Migration includes GRANTs for all new tables to `authenticated` and `service_role`.
- `assigned_role` column retained on `bn_workbasket` for back-compat; new code reads `bn_workbasket_role`.
- Static `BN_WORKFLOW_ROLES` fallback updated to include `BN_BENEFIT_OFFICER_GENERALIST`.

## Out of scope (ask before doing)
- Migrating `bn_product_version.*_workbasket_id` columns to multi-basket arrays.
- Mobile/offline delegation approval.

## Acceptance
- One user can hold INTAKE+DOC+ELIG+CALC+CLAIMS roles and sees all matching baskets.
- Same user blocked from approving own override unless policy `self_approval_allowed=true`.
- Validator passes with shared roles, fails only on the 4 listed conditions.
- TypeScript build passes.
