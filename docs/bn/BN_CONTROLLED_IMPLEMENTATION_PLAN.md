# Benefits & Claims — Controlled Implementation Plan

**Status:** Read-only plan. No code changes. Applies
`docs/implementation/CONTROLLED_MODULE_IMPLEMENTATION_RULES.md` to the
Benefits & Claims module.
**Companion docs:** `BN_IMPLEMENTATION_INVENTORY.md`,
`route_acceptance_matrix.md`, `legacy_table_usage_matrix.md`,
`permission_feature_flag_matrix.md`.

---

## 1. Guardrails (non-negotiable)

| # | Rule |
|---|---|
| G-1 | BN remains a **pluggable** module gated by `bn.*` feature flags and existing `user_role_permissions` rows. |
| G-2 | **Reuse** legacy tables (`ip_master`, `ip_wages`, `er_master`, `cn_receipt`, `cl_head*`, `cl_detail_*`, `cl_cheques*`, `cl_bank_acct`, etc.) through `src/services/bn/integration/*Adapter.ts`. Never re-create or duplicate them under `bn_*`. |
| G-3 | All write paths to legacy `cl_*` tables go through `paymentIssueService` / `postIssueService` (already in place) — no page-level direct writes. |
| G-4 | Approval / maker-checker flows reuse `workflow_tasks` (already done via `bnWorkflowIntegrationService`). No local approval tables. |
| G-5 | Notifications go through `bnNotificationIntegrationService` → existing notification engine. No parallel email/SMS engine. |
| G-6 | Permissions stay on `user_role_permissions`. A new granular set of keys (`approve_benefit_claim`, `issue_benefit_payment`, `configure_benefit_rules`, …) augments, but never replaces, `benefits_management`. |
| G-7 | All migrations additive (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) — R-MIGRATE-1. |
| G-8 | No `MOCK_*` constants, no `'SYSTEM'` audit fallbacks, no `PlaceholderPage` for visible-by-default items. |

---

## 2. Phased execution

Each phase is one Lovable implementation prompt. Do **not** combine phases;
each must end with the post-change verification gate (PV-1…PV-10).

### Phase 0 — Audit & docs (this pass)

Deliverables (already produced by the current pass): the 5 docs in
`docs/bn/`. No code changes. **Status: complete.**

### Phase 1 — Foundation (no UX impact)

1. Create `src/lib/bn/featureToggles.ts` mirroring
   `src/lib/compliance/featureToggles.ts`:
   - keys: `bn.claims.workbench`, `bn.claims.workbenchLegacy`,
     `bn.claims.queue`, `bn.claims.intake`, `bn.approval.console`,
     `bn.approval.queue`, `bn.entitlement`, `bn.payables`,
     `bn.payment.schedule`, `bn.payment.batches`, `bn.payment.issue`,
     `bn.payment.exceptions`, `bn.postIssue`, `bn.postIssue.enhanced`,
     `bn.history.claims`, `bn.history.payments`, `bn.history.audit`,
     `bn.servicing.lifeCert`, `bn.servicing.medicalReview`,
     `bn.servicing.overpayment`, `bn.servicing.awardSuspension`,
     `bn.servicing.survivors`, `bn.simulation`, `bn.person360`,
     `bn.dashboard`, plus `bn.config.*` (12 sub-keys), `bn.country.*` (6),
     `bn.medical.*` (8).
   - servicing keys default to **false** until Phase 3 lands real tables.
2. Wire menu builder (`bnMenuItems.ts`) and route registration
   (`AppRoutes.tsx`) so both sides honour the toggle (R-TOGGLE-1).
3. Replace orphan routes with explicit menu entries OR `<Navigate>`
   redirects to canonical URLs (R-ROUTE-1, R-ROUTE-4).

**Verification:** `route_acceptance_matrix.md` re-run; zero orphans, zero
duplicate URLs.

### Phase 2 — Audit-field & TODO cleanup (no schema change)

1. Replace `'SYSTEM'` and `userCode ?? 'SYSTEM'` in:
   - `services/bn/calculationEngine.ts:776`
   - `services/bn/simulationService.ts:60`
   - `pages/bn/approval/ApprovalConsole.tsx`
   - `pages/bn/claims/BenefitDetermination.tsx`
   - `pages/bn/claims/ClaimWorkbench.tsx`
   - `pages/bn/dashboard/BenefitsDashboard.tsx`
   with `requireUserCode()` from the shared auth helper used in Compliance.
2. No behaviour change otherwise.

**Verification:** grep `'SYSTEM'` and `TODO: get from auth context` in
`src/services/bn` and `src/pages/bn` returns zero hits.

### Phase 3 — Servicing tables + remove mock data

Additive migration introducing:
- `bn_award` (header, links `claim_id`, references `bn_product`)
- `bn_award_beneficiary`
- `bn_life_certificate` (links `bn_award`, status, due/received dates)
- `bn_overpayment` (links `bn_award`, recovery plan JSONB)
- `bn_medical_review_schedule` (links `bn_award` + `bn_claim`)
- `bn_award_suspension_event`

Rewrite the 5 mock-backed servicing pages to read/write the new tables.
Toggle the `bn.servicing.*` flags to `true` only after each screen lands.

**Verification:** grep `MOCK_` in `src/pages/bn` returns zero hits.

### Phase 4 — Granular permissions

1. Insert into `user_role_permissions` the new keys (G-6) for the existing
   "Benefits" role(s). Existing `benefits_management` remains the umbrella
   coarse-grained gate.
2. Wrap privileged action buttons (Approve, Reject, Issue Payment, Void,
   Publish Rule Version) with `PermissionWrapper` (R-PERM-2).
3. Replace any hardcoded role-name checks (none detected today — keep clean).

**Verification:** manual sweep of every action button across the 51 BN pages.

### Phase 5 — Acceptance & history confirmation

1. Confirm `/bn/claims/:id` (workbench) vs `/bn/claims/:id/legacy`
   (Claim360 historical) acceptance criteria documented.
2. Wire historical inquiry screens to `cl_head*` and `cl_detail_*` through
   a new `historicalInquiryAdapter` (read-only) instead of any direct
   service-level access from pages.
3. Add a `bn_route_acceptance_sweep.md` artifact (parallel to
   `docs/compliance/route_acceptance_sweep.md`) and have it pass.

### Phase 6 — Module reports & dashboard

Consolidate BN dashboards/reports following the Compliance reports
correction model (`docs/compliance/reports_correction_plan.md`): every
report submenu item gets a unique URL and a dedicated drill-down page.

---

## 3. Out of scope (this controlled track)

- Adding new benefit products beyond what the existing `bn_product` rows
  describe.
- Schema changes to legacy `cl_*`, `ip_*`, `er_*`, `cn_*` tables.
- Replacing the global workflow engine.
- Migrating away from Supabase to ASP.NET (covered by separate adapter
  swap once contracts hold).

---

## 4. Mandatory verification gate (every phase)

PV-1 Route sweep — every menu URL resolves; every route is reachable from a
menu or a documented redirect.
PV-2 No duplicate leaf URLs.
PV-3 No `PlaceholderPage` rendered for visible-by-default toggles.
PV-4 No `MOCK_*` in active services or pages.
PV-5 No `'SYSTEM'` audit fallback; `requireUserCode()` throws.
PV-6 All privileged buttons wrapped in `PermissionWrapper`.
PV-7 All write paths to legacy tables go through `src/services/bn/integration`.
PV-8 All approval/maker-checker actions hit `workflow_tasks`.
PV-9 TypeScript build green AND manual acceptance walk-through documented
in the matching `docs/bn/phaseX_results.md`.
PV-10 Update `BN_IMPLEMENTATION_INVENTORY.md` with phase delta.
