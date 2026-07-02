## EPIC-06B — Judicial Orders, Appeals & Enforcement

Build the full liability-aware lifecycle: Order/Judgment → Compliance Monitoring → Appeal → Enforcement → Recovery, layered on the existing `lg_order` + `lg_recoverable_liability` foundation. No AI, no mock data, no regressions to EPIC-02..06A.

---

### 1. Database (single migration)

Extend `lg_order`:
- Add: `court_file_no`, `judge_name`, `effective_date` (exists? verify), `appeal_deadline`, `costs_awarded`, `interest_awarded`, `penalty_awarded`, `compliance_status` (enum text), `enforcement_required` (bool), `appeal_status`, `enforcement_status`.
- Extend status check to include: `PARTIALLY_COMPLIED`, `UNDER_APPEAL`, `ENFORCED`, `CANCELLED` (in addition to existing).
- Add optional `ordered_amount_per_liability` via junction (see below).

Extend `lg_order_liability` (already exists):
- Add: `amount_ordered`, `outstanding_snapshot`, `compliance_status`, `notes`.

Create new tables (each with GRANTs to authenticated + service_role, RLS OFF per project NO-RLS policy):
- `lg_order_compliance_event` — id, order_id, case_id, event_type, event_date, amount, liability_id (nullable), remarks, created_by, created_at.
- `lg_appeal` — id, appeal_no, case_id, order_id, filing_party, grounds, filing_date, appeal_deadline, hearing_date, decision_date, outcome, status, recovery_impact_amount, remarks, created_by/at, updated_by/at.
- `lg_appeal_liability` — appeal_id, liability_id, notes.
- `lg_enforcement_action` — id, enforcement_no, case_id, order_id (nullable), enforcement_type, status, requested_date, approved_date, execution_date, officer_id, external_agency, amount_targeted, amount_recovered, outcome, next_action, remarks, created_by/at, updated_by/at.
- `lg_enforcement_liability` — enforcement_id, liability_id, allocated_amount, notes.

Number sequences: `LG-ORD-####` (exists), `LG-APL-####`, `LG-ENF-####` via existing `core_number_sequence`.

Triggers:
- On `lg_order_compliance_event` insert → recompute `lg_order.compliance_status` (Not Started / In Progress / Partially Complied / Complied / Breached).
- On `lg_appeal` insert/status change → set parent `lg_order.appeal_status` and flip `lg_order.status → UNDER_APPEAL` when Filed/Under Review.
- On `lg_enforcement_action` status change → set `lg_order.enforcement_status`; on Executed → allocate `amount_recovered` to `lg_recoverable_liability` via existing allocation path.
- Overdue breach: nightly-eligible SQL function `lg_flag_breached_orders()` (called from client scheduler or edge) — non-blocking, idempotent.

### 2. Types & state machines

- `src/types/legal/orderExtended.ts`, `appeal.ts`, `enforcement.ts`, `orderCompliance.ts`.
- Extend `src/services/legal/lgOrderStateMachine.ts` with new states + transitions.
- Add `lgAppealStateMachine.ts`, `lgEnforcementStateMachine.ts`.

### 3. Services (`src/services/legal/`)

- Extend `lgOrderService.ts`: liability linking with per-liability amount, compliance rollup, breach detection.
- New `lgOrderComplianceService.ts` — CRUD events, rollup calc.
- New `lgAppealService.ts` — CRUD, deadline validation (override capability), liability links.
- New `lgEnforcementService.ts` — CRUD, approval workflow, execution → payment allocation via existing `lgLiabilityService.allocatePayment`.
- New `lgJudicialOrderWorkbenchService.ts` — aggregate rows + KPIs + filters.
- Extend `lgUnifiedTimelineService.ts` — add `APPEAL`, `ENFORCEMENT`, `COMPLIANCE_EVENT` timeline kinds.
- Extend `lgRecoveryWorkbenchService.ts` + `lgRecoveryHealth.ts` — surface order/appeal/enforcement counts and next-action rules (breached order, appeal filed, enforcement active, compliance due soon).
- Extend `lgHearingWorkbenchService.ts` — expose "create order from outcome" helper and include order counts.

### 4. UI — Workbench + Detail

- `src/pages/legal/LgJudicialOrdersWorkbench.tsx` — 19 columns, 8 KPIs, 10 filters, bulk export.
- `src/pages/legal/LgOrderDetail.tsx` — 9 tabs (Overview, Linked Liabilities, Compliance, Appeals, Enforcement, Documents, Tasks, Timeline, Audit).
- Components under `src/components/legal/order/`:
  - `OrderLiabilityLinkCard.tsx` (uses existing `LiabilityLinkDialog`, adds per-liability amount).
  - `OrderComplianceTimeline.tsx`, `AddComplianceEventDialog.tsx`.
  - `OrderAppealsTab.tsx` + `AddAppealDialog.tsx`.
  - `OrderEnforcementTab.tsx` + `AddEnforcementDialog.tsx` + `ApproveEnforcementDialog.tsx` + `ExecuteEnforcementDialog.tsx`.
- Matter Workspace additions (`LgCaseDetail.tsx`):
  - Reuse existing Orders tab (extend for compliance/appeal chips).
  - New `LgCaseAppealsTab.tsx`, `LgCaseEnforcementTab.tsx`, `LgCaseComplianceTab.tsx`.
  - Snapshot rail: active orders, appeal deadlines, enforcement status, breach flags.
- Court Operations (`LgHearingWorkbench.tsx` + `HearingOutcomeDialog`): "Create Order from Outcome" wizard preselects hearing + liabilities.
- Recovery Workbench: extend child rows to show order/appeal/enforcement/compliance chips.

### 5. Documents & notices

Register template codes (empty-state safe): `ORDER_COPY`, `JUDGMENT_COPY`, `COMPLIANCE_NOTICE`, `BREACH_NOTICE`, `APPEAL_NOTICE`, `ENFORCEMENT_NOTICE`, `GARNISHMENT_NOTICE`, `WARRANT_PACKAGE`, `CLOSURE_NOTICE`. Use existing `core_template` + `generateDocument`.

### 6. Tasks (rule-based)

`lgOrderTaskRules.ts` — auto-create tasks on: order granted → compliance follow-up; appeal filed → deadline reminder; breach recorded → review; enforcement approved → preparation; enforcement executed → payment monitoring; order closed → closure review.

### 7. Permissions

Extend `useLgAccess.ts` with 19 capabilities listed in EPIC. Add to `permission-matrix.md`.

### 8. Routes

Register in legal router:
- `/legal/lg/orders` → Judicial Orders Workbench
- `/legal/lg/orders/:id` → Order Detail
- `/legal/lg/appeals` (list under workbench)
- `/legal/lg/enforcement` (list under workbench)

Add sidebar entries via `app_modules` migration.

### 9. Backward compatibility

- Orders without liability links: show "No liabilities linked" + link CTA; rollups fall back to `ordered_amount`. Never fabricate.
- Existing statuses map unchanged; new states are additive.

### 10. Analytics dataset

Create `src/config/explorer/judicialOrdersDataset.ts`, `appealsDataset.ts`, `enforcementDataset.ts` registered in existing Enterprise Data Explorer. No new framework work.

### 11. Documentation

- New: `docs/legal/EPIC-06B-JUDICIAL-ORDERS-APPEALS-ENFORCEMENT.md`.
- Append status notes to EPIC-04, EPIC-05, EPIC-06A docs.

### 12. Verification

- `tsgo` typecheck clean.
- Spot-run existing hearing/order flows to confirm no regression.
- Confirm liability rollup triggers still fire after new junctions.

---

### Delivery approach

Single migration + parallel service/component writes, then UI wiring, then docs. Estimated ~35 file writes and 1 migration. Delivered in one build pass; if verification uncovers regressions, a small EPIC-06B.1 stabilization pass can follow.

Approve to proceed.
