# BN Permission & Feature-Flag Matrix

**Status:** Read-only audit. R-PERM-* and R-TOGGLE-* applied.
**Audit date:** 2026-05-29.

---

## 1. Current state

### 1.1 Sidebar permission strings

Every leaf item in `bnMenuItems.ts` uses a single legacy permission:

```
requiresPermission: "benefits_management"
```

A handful of pages exist in adjacent menus with `"process_claims"`,
`"view_claims"`, `"apply_for_benefits"`, `"view_audit_logs"`,
`"system_administration"` (in `benefitsMenuItems.ts` /
`newBenefitMenuItems.ts` / `nbenefitMenuItems.ts`). These are legacy menus
not currently mounted in the live sidebar.

### 1.2 Capability hooks

- `src/hooks/useHasCapability.ts` is **Compliance-scoped**
  (`ComplianceCapability`). There is no `useBnCapability` equivalent.
- `src/hooks/bn/useSimPermission.ts` uses
  `useActionPermissions('bn_simulation')` — the only granular BN-side
  capability gate today.

### 1.3 `app_modules`

51 rows with `id` prefixed `bn_*`, all `is_enabled = true`. This is the
de-facto BN "feature flag" surface, but it is a binary visibility switch
shared with the menu builder.

### 1.4 No `src/lib/bn/featureToggles.ts`

There is **no** BN-side analog of `src/lib/compliance/featureToggles.ts`.
That means partial dark-launches require either `app_modules.is_enabled` or
ad-hoc code branches.

---

## 2. Gaps

| Gap | Rule | Impact |
|---|---|---|
| Single coarse permission `benefits_management` gates approve / issue / configure / simulate alike | R-PERM-2 | Privilege over-grant; no separation of duties for maker/checker. |
| No `bn` namespace in `useHasCapability` | R-PERM-2/3 | Components have no idiomatic way to check granular BN capability; encourages hardcoded role-name checks (which would violate R-PERM-3). |
| No `src/lib/bn/featureToggles.ts` | R-TOGGLE-1/2 | Cannot ship a half-built screen behind a default-false toggle without disabling its `app_modules` row. |
| Mock servicing pages are visible by default | R-PLACEHOLDER-1 | Users see fake awards / overpayments / life certificates today. |
| Privileged action buttons (Approve, Reject, Issue, Void, Publish Rule Version) not yet wrapped in `PermissionWrapper` | R-PERM-2 | A user without rights can attempt the action and only fail server-side. |

---

## 3. Proposed (do not implement yet) permission keys

To be added to `user_role_permissions` (rows only — no new permission
system, no new table). Coarse `benefits_management` remains the umbrella.

| Key | Gates |
|---|---|
| `view_benefit_claims` | claim worklist / queue / 360 / workbench (read) |
| `register_benefit_claim` | intake registration |
| `process_benefit_claim` | workbench edits, eligibility, calculation, evidence |
| `approve_benefit_claim` | approval console + adjudication workspace |
| `manage_benefit_entitlement` | entitlements lifecycle |
| `issue_benefit_payment` | payables queue, batches, payment issue |
| `void_benefit_payment` | post-issue void/reverse |
| `configure_benefit_rules` | rule groups, formulas, rules admin |
| `publish_benefit_rule_version` | version approval / publish |
| `configure_benefit_country_pack` | country pack screens |
| `configure_benefit_medical` | medical setup |
| `run_benefit_simulation` | simulation engine (already exists as `bn_simulation` action perm) |
| `view_benefit_history` | historical inquiry, payment history, audit history |
| `manage_benefit_servicing` | life cert, medical review, overpayment, suspension, survivors |
| `administer_benefits` | screen/document setup, workbasket, escalation, reason codes, service doc types, transitions |

Mapping each menu item to one or more of these keys is the deliverable of
Phase 4 (see `BN_CONTROLLED_IMPLEMENTATION_PLAN.md`).

---

## 4. Proposed `bn.*` feature toggle keys

To live in `src/lib/bn/featureToggles.ts` and be honoured by both the menu
builder and `AppRoutes.tsx`:

```
bn.dashboard
bn.person360
bn.claims.workbench
bn.claims.workbenchLegacy
bn.claims.queue
bn.claims.intake
bn.approval.console
bn.approval.queue
bn.entitlement
bn.payables
bn.payment.schedule
bn.payment.batches
bn.payment.issue
bn.payment.exceptions
bn.postIssue
bn.postIssue.enhanced
bn.history.claims
bn.history.payments
bn.history.audit
bn.servicing.lifeCert         (default false)
bn.servicing.medicalReview    (default false)
bn.servicing.overpayment      (default false)
bn.servicing.awardSuspension  (default false)
bn.servicing.survivors        (default false)
bn.simulation
bn.config.products
bn.config.rules
bn.config.rulesAdmin
bn.config.formulas
bn.config.documentSetup
bn.config.screenSetup
bn.config.transitions
bn.config.reasonCodes
bn.config.workbaskets
bn.config.escalation
bn.config.serviceDocTypes
bn.country.overview
bn.country.idRules
bn.country.addressModel
bn.country.participantTypes
bn.country.paymentConfig
bn.country.legalRefs
bn.medical.home
bn.medical.procedures
bn.medical.facilityAvailability
bn.medical.referralRules
bn.medical.reimbursementLimits
bn.medical.expenseTypes
bn.medical.reviewRules
bn.medical.documents
```

The 5 servicing keys default to **false** until Phase 3 lands the
supporting tables (`bn_award`, `bn_life_certificate`, etc.). Until then
those menu entries and routes should not be visible.

---

## 5. Workflow & notification integration — confirmed compliant

- `bnWorkflowIntegrationService.ts` → `workflow_tasks` /
  `workflow_definitions` (no parallel engine).
- `bnNotificationIntegrationService.ts` → existing notification engine
  (no third-party email/SMS).
- `useWorkflowActions.ts` already routes `bn_claim` source-module
  callbacks back into `bn_claim.status`.

No remediation required for workflow/notification surfaces; only audit-field
cleanup (Phase 2) and granular permissions (Phase 4).
