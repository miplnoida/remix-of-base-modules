# Benefits & Claims — Implementation Inventory

**Status:** Read-only audit (no code changes).
**Audit date:** 2026-05-29
**Scope:** Inventory of all existing BN routes, menus, pages, services, tables,
docs, legacy dependencies — as a baseline for the controlled re-plan, applying
`docs/implementation/CONTROLLED_MODULE_IMPLEMENTATION_RULES.md`.

---

## 1. Menus that point at BN

Three sidebar menu files reference the BN domain. Only `bnMenuItems.ts` is the
canonical, post-restructure menu. The other two are legacy/parallel surfaces.

| Menu file | Header | Status | Notes |
|---|---|---|---|
| `src/components/sidebar/menuItems/bnMenuItems.ts` | Benefit Management | **Canonical** — used by current sidebar | All leaf items carry `requiresPermission: "benefits_management"` |
| `src/components/sidebar/menuItems/benefitsMenuItems.ts` | Benefits Management | Legacy — mixes `/benefits/*` & `/bn/person-360` | Not consolidated into `bnMenuItems` |
| `src/components/sidebar/menuItems/newBenefitMenuItems.ts` | NewBenefit System | Legacy `/newbenefit/*` namespace | Parallel module |
| `src/components/sidebar/menuItems/nbenefitMenuItems.ts` | Central Benefits Registry | Legacy `/nbenefit/*` namespace | Parallel module |

`src/components/sidebar/sidebarMenuItems.ts` currently mounts only
`bnMenuItems` (alongside user/master/admin) — confirmed.

---

## 2. Routes registered in `AppRoutes.tsx`

51 BN routes (`/bn/*`) and ~30 legacy `/nbenefit/*` and `/newbenefit/*` routes
are registered. The full mapping is in `route_acceptance_matrix.md`.

Highlights:
- All 51 menu URLs in `bnMenuItems` **do** resolve to a real lazy-loaded
  component in `AppRoutes.tsx` (no missing-route 404s detected on the
  canonical menu — good).
- Several routes have **no menu entry** (orphans): `/bn/dashboard`,
  `/bn/exceptions`, `/bn/post-issue-enhanced`, `/bn/worklist`,
  `/bn/payment-history`, `/bn/audit-history`, `/bn/life-certificates`,
  `/bn/medical-reviews`, `/bn/overpayments`, `/bn/award-suspension`,
  `/bn/survivors`. These need either a menu entry or a `<Navigate>` redirect.
- `/bn/claims/:id/legacy` mounts `Claim360`, while `/bn/claims/:id` mounts
  `ClaimWorkbench` — needs explicit acceptance criteria so the two do not
  drift into duplicate-dashboard territory (R-ROUTE-3).

---

## 3. Pages on disk (`src/pages/bn/**`)

62 page components grouped under:
`approval/`, `batch/`, `claims/`, `config/` (+ `country/`, `medical/`),
`dashboard/`, `engine/`, `entitlement/`, `history/`, `intake/`, `issue/`,
`payables/`, `person360/`, `postissue/`, `schedule/`, `servicing/`,
`simulation/`.

Pages with confirmed defects vs. controlled rules:

| Page | Defect | Rule violated |
|---|---|---|
| `servicing/AwardSuspensionConsole.tsx` | `MOCK_AWARDS` array, no DB read | R-MOCK-1 |
| `servicing/LifeCertificateManagement.tsx` | `MOCK_CERTS` | R-MOCK-1 |
| `servicing/MedicalReviewScheduler.tsx` | `MOCK_REVIEWS` | R-MOCK-1 |
| `servicing/OverpaymentRecovery.tsx` | `MOCK_DATA` | R-MOCK-1 |
| `servicing/SurvivorsBenefitProcessing.tsx` | `MOCK_CASES`, `MOCK_DEPENDANTS` | R-MOCK-1 |
| `approval/ApprovalConsole.tsx` | `// TODO: get from auth context` | R-AUDIT-1 |
| `claims/BenefitDetermination.tsx` | `// TODO: get from auth context` | R-AUDIT-1 |
| `claims/ClaimWorkbench.tsx` | `userCode = 'SYSTEM'` hardcoded | R-AUDIT-1 |
| `dashboard/BenefitsDashboard.tsx` | `// TODO: Replace with actual auth context userCode` | R-AUDIT-1 |
| `services/bn/calculationEngine.ts:776` | `triggered_by: 'SYSTEM'` | R-AUDIT-1 |
| `services/bn/simulationService.ts:60` | `triggered_by: req.triggeredBy || 'SYSTEM'` | R-AUDIT-1 |

Pages that appear visually complete but are not yet confirmed to round-trip
to a real BN table (deep-verify required in Phase 2):
`config/RulesAdministration.tsx`, `config/ReasonCodes.tsx`,
`config/WorkbasketConfig.tsx`, `config/ProductEditor.tsx`,
`config/country/*` (5 pages), `intake/ClaimRegistration.tsx`,
`engine/CalculationWorkspace.tsx`, `history/AuditDecisionHistory.tsx`,
`history/PaymentHistoryInquiry.tsx`, `issue/PaymentExceptions.tsx`,
`issue/PaymentIssue.tsx`, `person360/BnPerson360.tsx`.

---

## 4. Services (`src/services/bn/`)

24 service modules + the `integration/` adapter sub-folder (8 adapters
covering person/contribution/employer/payment/notification/document/workflow/
event-bus). Architecture follows the contracts in
`docs/BN-INTEGRATION-ARCHITECTURE.md`.

Confirmed legacy table reads/writes:

| Adapter / service | Legacy table | Operation |
|---|---|---|
| `integration/personAdapter.ts` | `ip_master` | read (lookup, DOB, status, address) |
| `integration/contributionAdapter.ts` | `ip_wages` | read (weekly wages, summary) |
| `integration/employerAdapter.ts` | `er_master`, `ip_wages` | read |
| `integration/notificationAdapter.ts` | `ip_master` | read (recipient resolution) |
| `bnNotificationIntegrationService.ts` | `ip_master` | read |
| `person360Service.ts` | `cl_cheques`, `ip_wages` | read |
| `paymentIssueService.ts` | `cl_cheques`, `cl_cheques_holding` | **insert / update** |
| `postIssueService.ts` | `cl_cheques_survivor`, `cl_cheques_holding` | read/update |
| `batchOperationsService.ts` | `cl_cheques` | read |

Workflow integration uses the global `workflow_tasks` / `workflow_definitions`
(`bnWorkflowIntegrationService.ts`, `useWorkflowActions.ts → 'bn_claim'`).
No parallel workflow engine detected — compliant with R-WORKFLOW-1.

---

## 5. BN-owned tables in Supabase (`public.bn_*`)

64 BN tables already exist (full list captured during audit):

- **Catalog / config:** `bn_product`, `bn_product_version`, `bn_scheme`,
  `bn_country`, `bn_country_*` (5), `bn_rule_group`, `bn_eligibility_rule`,
  `bn_calculation_rule`, `bn_timeline_rule`, `bn_interaction_rule`,
  `bn_formula_template`, `bn_document_profile`, `bn_doc_requirement`,
  `bn_screen_template`, `bn_field_metadata`, `bn_workbasket`,
  `bn_workflow_template`, `bn_claim_status_def`, `bn_claim_transition_rule`,
  `bn_reason_code`, `bn_escalation_policy`, `bn_service_doc_type`,
  `bn_override_policy`, `bn_branch`, `bn_version_approval`.
- **Claim lifecycle:** `bn_claim`, `bn_claim_detail`, `bn_claim_event`,
  `bn_claim_note`, `bn_claim_eligibility`, `bn_claim_calculation`,
  `bn_claim_decision`, `bn_claim_document`, `bn_claim_evidence`,
  `bn_claim_queue_assignment`, `bn_evidence_checklist`, `bn_evidence_audit`,
  `bn_escalation_event`.
- **Calculation:** `bn_calc_run`, `bn_calc_trace`, `bn_calc_override`,
  `bn_calc_simulation_preset`, `bn_calc_legacy_snapshot`.
- **Medical:** `bn_medical_procedure`, `bn_medical_facility`,
  `bn_medical_facility_procedure`, `bn_medical_referral_rule`,
  `bn_medical_reimbursement_limit`, `bn_medical_expense_type`,
  `bn_medical_claim_expense`, `bn_medical_reimbursement_calc`,
  `bn_medical_recommendation`.
- **Simulation (isolated):** `bn_sim_scenario`, `bn_sim_run`,
  `bn_sim_run_input`, `bn_sim_run_output`, `bn_sim_rule_trace`,
  `bn_sim_formula_trace`, `bn_sim_config_snapshot`.
- **Payment intent:** `bn_payment_instruction`.
- **Eventing:** `bn_module_events`.

**Gap:** there is no `bn_award` / `bn_entitlement` / `bn_life_certificate` /
`bn_overpayment` / `bn_medical_review_schedule` table yet — the corresponding
servicing screens currently fall back to mock data (see §3).

---

## 6. Legacy tables BN must reuse (not recreate)

Adapter-routed, do **not** clone:

| Legacy table | Used by | Mode |
|---|---|---|
| `ip_master` | personAdapter, notificationAdapter | read |
| `ip_wages` | contributionAdapter, employerAdapter, person360Service | read |
| `er_master` | employerAdapter | read |
| `cn_receipt` | (referenced by spec; not yet wired) | read (when wired) |
| `cl_head` (+ variants `cl_head_orig`, `cl_head_recalc`, `cl_head_wages`, `cl_head_notes`) | (spec only; not yet wired) | read (historical) |
| `cl_detail_*` (sb, sib, matern, funeral, pen, me, refund, ui_*) | (spec only; not yet wired) | read (historical) |
| `cl_cheques` | paymentIssueService, batchOperationsService, person360Service | **insert / read** |
| `cl_cheques_holding` | paymentIssueService, postIssueService | insert / update |
| `cl_cheques_survivor` | postIssueService | read / update |
| `cl_bank_acct`, `cl_track`, `cl_void`, `cl_notification`, `cl_online_details`, `cl_wages_credited` | (spec; not yet wired) | read |

See `legacy_table_usage_matrix.md` for the row-level map and whether each
access is currently routed through an adapter (preferred) or direct (must be
refactored under R-ARCH-1 below).

---

## 7. Permissions / feature flags

- All `bnMenuItems` entries carry `requiresPermission: "benefits_management"`.
  No granular per-screen permission strings yet (`manage_benefits_payments`,
  `approve_benefit_claim`, `configure_benefit_rules`, etc.).
- There is **no** `src/lib/bn/featureToggles.ts`. Compliance uses
  `src/lib/compliance/featureToggles.ts` as the precedent; BN should follow
  the same shape with a `bn.*` namespace.
- `app_modules` already has 51 rows for `bn_*` keys (all `is_enabled = true`)
  — these double as the route registry surface used by Compliance's gating.

Detailed gap analysis: `permission_feature_flag_matrix.md`.

---

## 8. Documentation surface

Specifications already present:
`bn-domain-model.md`, `BN-INTEGRATION-ARCHITECTURE.md`,
`BN-SIMULATION-ISOLATION-MANIFEST.md`, `BN_Enterprise_Data_Model.md`,
`BN_Build_Tickets.md`, plus 11 `BN_*_Specification.md` files covering Claim
Workbench, Benefit Determination, Approval Console, Workflow Integration,
Notification Integration, Payables Queue, Payment Schedule, Payment Issue,
Batch Operations, Post-Issue Review, Historical Inquiry, Entitlement
Management, Service API Architecture.

**Missing:** module inventory, controlled plan, route acceptance matrix,
legacy-table matrix, permission/flag matrix — created by this audit.

---

## 9. High-risk gaps (consolidated)

1. **Mock data in production servicing screens (5 pages)** — R-MOCK-1.
2. **`'SYSTEM'` audit fallbacks in 6 places** — R-AUDIT-1.
3. **Orphan routes** (11 BN routes have no menu entry) — R-MENU/R-ROUTE drift.
4. **Servicing tables missing** (`bn_award`, `bn_life_certificate`,
   `bn_overpayment`, `bn_medical_review_schedule`) — additive migration needed.
5. **Parallel benefit namespaces** (`/nbenefit/*`, `/newbenefit/*`,
   `/benefits/*`) coexist with `/bn/*` — confusion risk; need
   redirect-only consolidation, never duplicate functionality.
6. **`/bn/claims/:id` vs `/bn/claims/:id/legacy`** — must remain distinct
   (workbench vs legacy 360); document acceptance.
7. **No `bn` feature toggle module** — every screen is on/off only via
   `is_enabled` in `app_modules`; cannot dark-launch partial features.
8. **`paymentIssueService` writes to `cl_cheques` directly** — confirm this is
   approved per the spec (it is in `BN_Payment_Issue_Specification.md`) and
   that the write path uses an adapter, not raw inline SQL inside the page.
9. **Granular permission keys absent** — single `benefits_management` flag
   gates approval, payment issue, configuration, simulation alike.
10. **No `bn` test-coverage harness** (e.g. route acceptance sweep) equivalent
    to `docs/compliance/route_acceptance_sweep.md`.

See `BN_CONTROLLED_IMPLEMENTATION_PLAN.md` for the phased remediation order.
