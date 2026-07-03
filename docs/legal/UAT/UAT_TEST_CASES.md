# Legal V1 — UAT Test Cases

**Version:** 1.0  
**Total cases:** 112 (Modules A–I + Negatives)  
**Case template:** ID · Module · Objective · Pre-condition · Test data · Steps · Expected · Actual · Pass/Fail · Severity · Evidence · Owner role

> Owner role = who *executes* the test. Actual/Pass-Fail/Severity/Evidence are filled at execution time in `UAT_EXECUTION_TRACKER.md`.

---

## Module A — Compliance → Legal Referral (12)

### UAT-A-001 · Forward multi-component compliance case
- **Objective:** Compliance user forwards 5 selected components to Legal.
- **Pre-condition:** CC-2024-0002 finalized with ≥5 due components.
- **Test data:** SS Jan24, HSD Jan24, SEV Feb24, Interest Jan-Feb24, Penalty Mar24.
- **Steps:** Open Compliance case → Actions → Forward to Legal → select 5 components → Submit.
- **Expected:** Referral `CMP-LR-SKN-2026-000002` created; 5 `core_legal_referral_item` PENDING.
- **Owner:** Compliance Officer.

### UAT-A-002 · Selected-only forwarding (subset)
- **Objective:** Only ticked components create referral items.
- **Steps:** Forward with 3 of 5 components ticked.
- **Expected:** 3 referral items; 2 remain on compliance case, not on referral.
- **Owner:** Compliance Officer.

### UAT-A-003 · Multiple contribution periods preserved
- **Expected:** `period_from`/`period_to` copy exactly per component (Jan24 ≠ Feb24 ≠ Mar24).
- **Owner:** Compliance Officer.

### UAT-A-004 · Referral appears in Legal Intake queue
- **Expected:** `/legal/lg/intake` shows new intake within 5 s.
- **Owner:** LG_CASE_HANDLER.

### UAT-A-005 · Referral item acceptance flips status
- **Steps:** Accept intake → open referral items panel → all items ACCEPTED.
- **Expected:** `core_legal_referral_item.status='ACCEPTED'` for all rows.
- **Owner:** LG_APPROVER.

### UAT-A-006 · Liability creation from accepted items
- **Expected:** 1 `lg_recoverable_liability` per accepted item; fund/liability type set.
- **Owner:** LG_APPROVER.

### UAT-A-007 · Financial rollup after enrichment
- **Expected:** `v_lg_case_financials.total_assessed` = sum of component amounts.
- **Owner:** LG_CASE_HANDLER.

### UAT-A-008 · Idempotent enrichment (re-run)
- **Steps:** Trigger "Refresh from Compliance" twice.
- **Expected:** No duplicate liabilities; count unchanged.
- **Owner:** LG_CASE_HANDLER.

### UAT-A-009 · Party auto-population
- **Expected:** SSB = Complainant; Employer = Respondent in `lg_case_party`.

### UAT-A-010 · CE stamping (traceability)
- **Expected:** `ce_cases` shows `lg_case_no`, `lg_intake_no`, `lg_referral_no`.

### UAT-A-011 · Referral cancellation before acceptance
- **Steps:** Compliance user recalls referral before Legal accepts.
- **Expected:** Referral status `WITHDRAWN`; intake removed from queue.

### UAT-A-012 · Referral with benefit overpayment component
- **Test data:** BN overpayment component.
- **Expected:** Liability created with `liability_type=BENEFIT_OVERPAYMENT`.

---

## Module B — Legal Intake (10)

### UAT-B-001 · View intake detail
- **Expected:** All 5 components visible with amounts, periods, fund.

### UAT-B-002 · Qualification checklist appears
- **Expected:** Checklist template loaded; required items listed.

### UAT-B-003 · Save partial checklist
- **Expected:** Draft persists across reload.

### UAT-B-004 · Request information
- **Steps:** Click "Request Info" → enter reason → send.
- **Expected:** `lg_intake_info_request` row created; intake stays OPEN.

### UAT-B-005 · Reject intake
- **Steps:** Approver rejects with reason.
- **Expected:** Intake status REJECTED; audit row in `lg_intake_decision_audit`.

### UAT-B-006 · Reject blocks case creation
- **Expected:** No `lg_case` row generated for rejected intakes.

### UAT-B-007 · Approve intake creates matter
- **Expected:** `lg_case_intake.qualification_status='APPROVED'` triggers new `lg_case`.

### UAT-B-008 · Matter number format
- **Expected:** `LG-SKN-YYYY-NNNNNN` sequential per office.

### UAT-B-009 · Intake gate blocks non-APPROVED
- **Negative:** Attempt case create when status = PENDING.
- **Expected:** Trigger `lg_case_intake_gate` blocks; user sees error.

### UAT-B-010 · Assistant cannot approve intake
- **Role:** LG_LEGAL_ASSISTANT.
- **Expected:** "Approve" button disabled; server returns PermissionError if hit.

---

## Module C — Matter Workspace (Case 360) (14)

### UAT-C-001 · Open matter LG-SKN-2026-000017
- **Expected:** Header shows case no, employer, stage, assessed/outstanding.

### UAT-C-002 · Parties tab lists Complainant + Respondent
### UAT-C-003 · Liabilities tab shows 5 rows for CE-originated case
### UAT-C-004 · Financials tab totals reconcile to `v_lg_case_financials`
### UAT-C-005 · Timeline shows creation, enrichment, intake events
### UAT-C-006 · Documents tab lists intake docs
### UAT-C-007 · Add manual note
- **Expected:** `lg_case_note` row created; visible in timeline.

### UAT-C-008 · Assign officer
- **Role:** LG_APPROVER.
- **Expected:** `lg_case_assignment` row; case header shows assignee.

### UAT-C-009 · Reassign case
### UAT-C-010 · Case Completeness panel — CE case passes liability check
### UAT-C-011 · Case Completeness — flag missing respondent address
- **Negative:** Remove respondent address → panel flags missing item.
### UAT-C-012 · Governance panel shows workflow policy applied
### UAT-C-013 · Stage transition (INTAKE → PRE_LITIGATION)
- **Expected:** `lg_case_stage_history` row logged.
### UAT-C-014 · Close matter (LG_APPROVER only)
- **Test data:** SEED-LG-2026-0003 (fully paid).

---

## Module D — Recoverable Liabilities (12)

### UAT-D-001 · SS contribution liability visible
### UAT-D-002 · Housing Levy liability with correct fund code
### UAT-D-003 · Severance component amount matches referral
### UAT-D-004 · Interest liability linked to parent contribution period
### UAT-D-005 · Penalty liability with penalty policy reference
### UAT-D-006 · Benefit overpayment liability (`liability_type=BENEFIT_OVERPAYMENT`)
### UAT-D-007 · Partial payment allocation
- **Test data:** SEED-LG-2026-0001 (paid = 25,875 of 51,750).
- **Expected:** Outstanding auto-recomputed.

### UAT-D-008 · Outstanding = assessed − paid (invariant)
### UAT-D-009 · Allocations sum equals `paid`
### UAT-D-010 · Retrofit tool loads compliance amounts
### UAT-D-011 · Write-off updates `total_written_off`
### UAT-D-012 · Liability audit trail (`lg_liability_audit`) captures amount changes

---

## Module E — Court Operations (10)

### UAT-E-001 · Create hearing on LG-SKN-2026-000017
### UAT-E-002 · Assign court, division, officer from master
### UAT-E-003 · Record hearing outcome — ADJOURNED
### UAT-E-004 · Record hearing outcome — JUDGMENT
- **Expected:** Prompt to create `lg_order` type JUDGMENT.

### UAT-E-005 · Create Consent Order with installments
- **Test data:** SEED-LG-2026-0003 (1 order + 6 installments seeded).

### UAT-E-006 · Mark installment PAID
### UAT-E-007 · Consent order BREACH auto-flag on missed installment
### UAT-E-008 · Enforcement action created from breached order
### UAT-E-009 · Hearing calendar shows upcoming date
### UAT-E-010 · Hearings list filter by court

---

## Module F — Appeals (6)

### UAT-F-001 · File appeal against JUDGMENT order
- **Test data:** SEED-LG-2026-0002.

### UAT-F-002 · Link appeal to selected liabilities
- **Expected:** `lg_appeal_liability` rows created for chosen liabilities only.

### UAT-F-003 · Appeal freeze — enforcement disabled on linked liabilities
### UAT-F-004 · Record appeal outcome PARTIALLY_ALLOWED
### UAT-F-005 · Recovery impact amount recorded (excluded from `v_lg_case_financials`)
### UAT-F-006 · Appeal timeline updates matter timeline

---

## Module G — Post-Judgment Recovery (10)

### UAT-G-001 · Judgment compliance dashboard shows outstanding judgment
### UAT-G-002 · Create recovery assignment (SEED-LG-2026-0001)
### UAT-G-003 · Assignment ↔ liabilities linked via `lg_recovery_assignment_liability`
### UAT-G-004 · Consent order breach event escalation
### UAT-G-005 · Enforcement action GARNISHMENT — partial recovery
- **Test data:** SEED-LG-2026-0002.

### UAT-G-006 · External counsel engagement create
### UAT-G-007 · Court filing with fee capture
### UAT-G-008 · Legal cost linked to filing (`lg_cost_liability`)
### UAT-G-009 · Legal cost pending-award state
### UAT-G-010 · Recovery workbench shows child components per case

---

## Module H — Dashboards & Reports (8)

### UAT-H-001 · `/legal/lg/dashboard` loads without error
### UAT-H-002 · Dashboard case count matches DB (`select count(*) from lg_case`)
### UAT-H-003 · Recovery Workbench totals reconcile to view
### UAT-H-004 · Case financial totals reconcile between Matter Workspace and view
### UAT-H-005 · Reports export CSV
### UAT-H-006 · Reports export PDF
### UAT-H-007 · Filter by stage / court / officer
### UAT-H-008 · Empty-state renders when no matching cases

---

## Module I — Security & Permissions (12)

Each row applies to routes/actions in `permission-matrix.md`.

### UAT-I-001 · LG_READ_ONLY can view matter, cannot edit
### UAT-I-002 · LG_READ_ONLY blocked from Intake approval
### UAT-I-003 · LG_LEGAL_ASSISTANT can draft notice, cannot approve
### UAT-I-004 · LG_CASE_HANDLER can create hearing/order/settlement
### UAT-I-005 · LG_REVIEWER can approve notice, cannot close case
### UAT-I-006 · LG_APPROVER can close case, publish order, approve settlement
### UAT-I-007 · LG_ADMIN can manage templates, fees, policy
### UAT-I-008 · SYSTEMADMIN inherits all Legal capabilities
### UAT-I-009 · Route guard blocks unauthorized `/legal/admin/*`
### UAT-I-010 · Confidential document redacted for non-privileged role
### UAT-I-011 · PII unlock logged in `pii_unlock_logs`
### UAT-I-012 · Server rejects direct API call bypassing UI (defence in depth)

---

## Negative Tests (18)

### UAT-N-001 · Duplicate referral
- **Steps:** Forward same compliance case twice.
- **Expected:** Second attempt blocked or produces WITHDRAWN duplicate; no double liability.

### UAT-N-002 · Missing contribution period on component
- **Expected:** Referral wizard blocks submission with inline error.

### UAT-N-003 · Invalid liability amount (negative)
- **Expected:** Validation error; row not saved.

### UAT-N-004 · Unauthorized approval attempt
- **Role:** LG_LEGAL_ASSISTANT.
- **Expected:** Toast "You do not have permission to approve intake."

### UAT-N-005 · Update on CLOSED matter
- **Expected:** Edit controls disabled; server returns 403 if forced.

### UAT-N-006 · Duplicate liability creation
- **Steps:** Manual "Add liability" identical to existing.
- **Expected:** Unique-constraint / duplicate-check prevents insert.

### UAT-N-007 · Payment greater than outstanding
- **Expected:** Blocked with message; no negative outstanding.

### UAT-N-008 · Missing respondent address on notice generation
- **Expected:** Notice wizard blocks Send step.

### UAT-N-009 · Inactive master value selection (court, fee code)
- **Expected:** Dropdown excludes inactive; direct submit rejected.

### UAT-N-010 · Broken consent order (missing installment schedule)
- **Expected:** Consent order save blocked until schedule present.

### UAT-N-011 · Referral without any selected component
- **Expected:** Submit disabled.

### UAT-N-012 · Reject intake with no reason
- **Expected:** Reason required; submit blocked.

### UAT-N-013 · Close matter with outstanding balance
- **Expected:** Requires reason / override; audited.

### UAT-N-014 · Appeal on non-JUDGMENT order
- **Expected:** Appeal filing blocked or restricted.

### UAT-N-015 · Enforcement without publishable order
- **Expected:** Blocked.

### UAT-N-016 · External counsel engagement with expired counsel record
- **Expected:** Blocked.

### UAT-N-017 · Legal cost without fee master row
- **Expected:** Blocked.

### UAT-N-018 · Concurrent enrichment (two users)
- **Expected:** No duplicate liabilities; last-writer-wins on financial snapshot.

---

## Summary

- Module A: 12 · B: 10 · C: 14 · D: 12 · E: 10 · F: 6 · G: 10 · H: 8 · I: 12 · Negatives: 18
- **Total: 112 UAT test cases**
