# Compliance & Enforcement — End-to-End Validation Plan

**Status:** Draft — Batch 1 (Data + C3 + Payment detection)
**Scope this document covers:** Scenarios **A, B, C, D, E, F, J**
**Remediation appetite this round:** Discovery + plan only, **no code fixes**. Defects surfaced during execution will be logged to `compliance_end_to_end_gap_register.md` and remediated in a later approved round.
**Test data policy:** Synthetic UAT rows may be INSERTed into `er_master`, `ip_master`, `cn_c3_reported`, `cn_payment`, and Compliance (`ce_*`) tables. All records tagged with prefix `UAT-B1-` and idempotent by that key. No changes to Employer, C3, or Payment module code.

---

## 1. Active Compliance Surface (as discovered)

### 1.1 Routes registered in `src/components/routing/AppRoutes.tsx`
Compliance is a self-contained top-level module (`/compliance/*`) with sub-areas:
`dashboards`, `violations`, `cases`, `notices`, `arrangements`, `waivers`, `inspections`,
`legal`, `risk`, `sampling`, `reports`, `automation`, `admin`, `settings`, `workbench`,
`geography`, `staff`, `tools`, `operations`, `audit-planning`, `employers`.

Access gating: global `ComplianceAccessGate` (in `ProtectedLayout`) for permission,
`ComplianceFeatureGate` for feature-flag gating. Legacy `ComplianceRouteGuard` retired.

### 1.2 Services in scope for Batch 1
- `violationService.ts`, `violationLifecycleService.ts`, `violationActionsService.ts`
- `complianceDataService.ts`, `complianceAuditService.ts`
- `noticeService.ts`, `noticeWorkflowService.ts`
- `centralPaymentArrangementService.ts`, `arrangementPolicyService.ts`, `arrangementWorkflowService.ts`
- `complianceWorkflowMappingService.ts`, `compliancePolicyService.ts`
- `riskProfileService.ts`, `riskPolicyService.ts`
- `complianceSimulatorEngine.ts` (detection preview)

### 1.3 Configuration state (production DB, read-only inspection)
| Table | Rows | Notes |
|---|---|---|
| `ce_violation_types` | 15 active | Includes LATE_FILING, NON_FILING, NON_PAYMENT, PARTIAL_PAYMENT, UNDER_DECLARATION, EMPLOYEE_DISCREPANCY, LEVY_OMISSION, SEVERANCE_OMISSION, ARRANGEMENT_DEFAULT, LEGAL_DEFAULT, REPEAT_DEFAULT, UNREGISTERED_EMPLOYER, CESSATION_WITHOUT_CLEARANCE, LEVY_SEVERANCE_OMISSION, plus one seed value `VT-001` (data hygiene note). |
| `ce_detection_rules` | 14 | Keyed by `rule_code`, references `violation_type_id`, `trigger_event`, `condition_expression`, `parameters`. Only `is_enabled=true` rows fire. |
| `ce_workflow_mappings` | 58 | Keyed by `event_key`; resolves to `workflow_definition_id` with severity/fund/amount filters and priority ordering. `fallback_behavior` governs unmapped events. |
| `ce_arrangement_policies` | 2 | Governs `max_arrangement_months`, `min_down_payment_percent`, `max_missed_installments`, `breach_grace_days`, `auto_terminate_on_breach`. |
| `ce_legal_handoff_rules` | 1 | Prerequisites: `required_notice_count`, `days_after_final_notice`, `min_outstanding_amount`, `min_severity`, `require_repeat_default`, `require_arrangement_breach`. |
| `ce_waiver_rules` | **0** | ⚠️ Empty — Scenario P (later batch) will be blocked unless seeded. Noted here for cross-batch tracking. |
| `ce_risk_bands` | 4 | LOW / MEDIUM / HIGH / CRITICAL score windows. |
| `ce_automation_jobs` | 30 | Includes detection sweeps, breach monitors, risk recompute. |
| `ce_violations` (open) | 4,386 | Existing production-shape data; UAT rows must be filterable by `UAT-B1-` reference to avoid pollution. |
| `ce_cases` (open) | 38 | Same isolation applies. |

### 1.4 Feature toggles relevant to Batch 1
From `src/lib/compliance/featureToggles.ts`:
`violations.verificationQueue`, `notices.generate`, `notices.deliveryTracking`,
`arrangements.new`, `arrangements.active`, `risk.scoring`, `reports.automationJobs`.
DB-backed via `feature_flags` table; helper falls back to default `true` on cache miss.

### 1.5 Roles / capabilities
`src/lib/compliance/capabilities.ts` defines `inspector`, `senior`, `head`, `other`.
Phase-1 fallback: all capabilities resolve to legacy `manage_compliance` permission.
Batch 1 needs at minimum: **Compliance Officer** (inspector), **Compliance Manager** (senior/head), **Compliance Admin**.

---

## 2. Test Data Design (Batch 1 subset)

All identifiers prefixed `UAT-B1-`. Employer regnos in the reserved synthetic range `UATB1001..UATB1099`. To be documented in full in `compliance_e2e_test_data.md` at execution time.

| Employer | Purpose | Setup |
|---|---|---|
| `UATB1001` | Scenario A — Clean | Active employer, 3 employees registered on incorporation date, all C3 filed on/before due date for last 3 periods, all payments matched in full. |
| `UATB1002` | Scenario B — Late C3 | Same employees as A. Latest C3 posted **7 days after** deadline. Payment on time. |
| `UATB1003` | Scenario C — Missing C3 | No `cn_c3_reported` row for latest period; prior periods clean. Employer active. |
| `UATB1004` | Scenario D — No Payment | C3 filed on time for latest period; no `cn_payment` row for that period. |
| `UATB1005` | Scenario E — Partial Payment | C3 filed on time; `cn_payment` covers ~40% of contribution due. |
| `UATB1006` | Scenario F — Late Payment | C3 filed on time; payment posted 10 days after due date, full amount. |
| `UATB1007` | Scenario J — Contribution Gap | Employee active across 6 periods; C3 rows exist for 4 of 6 (2 gap periods sandwiched between filed periods). |

Seed script location (to be authored in execution round): `scripts/compliance/uat/batch1_seed.sql` — must be idempotent (`ON CONFLICT DO NOTHING` / `DELETE ... WHERE reference LIKE 'UAT-B1-%'` teardown block).

---

## 3. Scenario Definitions — Batch 1

### Common columns
- **Business purpose**
- **Source data required**
- **Configuration required (must already exist; not created)**
- **User role executing**
- **Expected violation(s)**
- **Expected workflow branch**
- **Expected notices**
- **Expected case outcome**
- **Expected payment / legal path**
- **Expected final state**
- **Affected tables**
- **Affected routes**
- **Pass/fail evidence**

---

### Scenario A — Clean Employer (`UATB1001`)

| Field | Value |
|---|---|
| Business purpose | Prove clean employers produce **no false positives** across detection, risk, and notices. |
| Source data | Employer + 3 employees + 3 periods of C3 + matching payments, all on-time. |
| Configuration | Existing detection rules for LATE_FILING, NON_FILING, NON_PAYMENT, PARTIAL_PAYMENT enabled. No override rules targeting employer size = 3. |
| User role | Compliance Officer (assigned zone must cover employer's office). |
| Expected violations | **None.** |
| Expected workflow | No workflow instance created for this employer in Batch-1 test window. |
| Expected notices | None. |
| Expected case outcome | No case. |
| Expected payment / legal path | N/A. |
| Expected final state | Risk score in LOW band; `ce_employer_compliance_status` = compliant; `ce_violations` filtered by employer → 0 open UAT rows. |
| Affected tables | `ce_violations`, `ce_cases`, `ce_notices`, `ce_risk_profiles`, `ce_employer_compliance_status`. |
| Affected routes | `/compliance/violations/management`, `/compliance/risk/high-risk`, `/compliance/employers/*`, `/compliance/dashboards/officer`. |
| Evidence | (a) SQL: `SELECT count(*) FROM ce_violations WHERE payer_id='UATB1001' AND created_at > <seed_ts>` = 0. (b) Screenshot: Violations Management filtered by employer → empty. (c) Risk profile page shows LOW. |

---

### Scenario B — Late C3 Filing (`UATB1002`)

| Field | Value |
|---|---|
| Business purpose | Late filing rule fires, violation created and correctly closed if employer already corrected before officer action. |
| Source data | C3 submitted 7 days after deadline. |
| Configuration | Detection rule mapped to `LATE_FILING` violation type; workflow mapping for `event_key` covering `LATE_FILING`. |
| User role | Compliance Officer (verification), Compliance Manager (any escalation). |
| Expected violations | 1× `LATE_FILING`, severity MEDIUM (default). |
| Expected workflow | Assignment → Verification Queue → close as *corrected before notice* (since filing already exists). |
| Expected notices | Depends on config: expected **no notice** if late-filing correction detected pre-notice; document exact config outcome in execution. |
| Expected case outcome | No case unless workflow mapping's `auto_create_case`-equivalent flag says otherwise. |
| Expected payment / legal path | N/A. |
| Expected final state | Violation status = `CLOSED` (reason: corrected) OR `RESOLVED`. No duplicate. |
| Affected tables | `ce_violations`, `ce_violation_history`, `ce_case_assignments` (queue only, no case row). |
| Affected routes | `/compliance/violations/verification-queue`, `/compliance/violations/management`, `/compliance/violations/:id`. |
| Evidence | SQL: exactly 1 UAT LATE_FILING violation for `UATB1002`, terminal status. Screenshot: Verification Queue shows item; Violation Details shows history entries. |

---

### Scenario C — Missing C3 (`UATB1003`)

| Field | Value |
|---|---|
| Business purpose | Non-filing detection fires after configured threshold; case created if unresolved. |
| Source data | No `cn_c3_reported` row for target period past threshold days. |
| Configuration | Detection rule mapped to `NON_FILING`; workflow mapping should include case-creation branch when severity=HIGH (default for NON_FILING). |
| User role | Compliance Officer (verification, notice draft), Compliance Manager (notice approval if configured), Compliance Admin (config visibility check). |
| Expected violations | 1× `NON_FILING`, severity HIGH. |
| Expected workflow | Assignment → Verification → Notice draft → Notice send → Case creation if not resolved after response window. |
| Expected notices | Initial non-filing notice generated at correct workflow stage. |
| Expected case outcome | Case in `ce_cases` linked to violation, status = `OPEN`. |
| Expected payment / legal path | Not yet applicable in Batch 1 (Legal handoff = Batch 5). |
| Expected final state | Violation status = `IN_PROGRESS`; case open; 1 notice generated + delivery log entry. |
| Affected tables | `ce_violations`, `ce_notices`, `ce_notice_delivery_log`, `ce_cases`, `ce_case_violations`, `ce_case_assignments`. |
| Affected routes | `/compliance/violations/verification-queue`, `/compliance/notices/generate`, `/compliance/notices/register`, `/compliance/cases/management`, `/compliance/cases/:id`. |
| Evidence | SQL join across violation → case → notice for `UATB1003`. Screenshots of each stage. |

---

### Scenario D — Payment Not Received (`UATB1004`)

| Field | Value |
|---|---|
| Business purpose | Non-payment detection when C3 exists but no matching payment. |
| Source data | `cn_c3_reported` row present; no `cn_payment` row for the same period/payer. |
| Configuration | Detection rule mapped to `NON_PAYMENT`; workflow mapping present. |
| User role | Compliance Officer; Compliance Finance User (payment allocation visibility). |
| Expected violations | 1× `NON_PAYMENT`, severity HIGH. |
| Expected workflow | Assignment → Verification → Notice → Case or payment follow-up. |
| Expected notices | Payment reminder / demand notice per template resolution. |
| Expected case outcome | Case opened if unresolved past response window. |
| Expected payment / legal path | Arrangement path becomes available (Batch 4 will exercise). Batch 1 only asserts availability of the "Request Arrangement" action for this violation in the officer's UI. |
| Expected final state | Violation open; 1 notice generated. |
| Affected tables | `ce_violations`, `ce_notices`, `ce_case_recommendations`. |
| Affected routes | `/compliance/violations/management`, `/compliance/notices/*`, `/compliance/arrangements/new` (link visible, not exercised). |
| Evidence | SQL and screenshot per above. |

---

### Scenario E — Partial Payment (`UATB1005`)

| Field | Value |
|---|---|
| Business purpose | Partial payment triggers correct violation with **correct outstanding amount** and offers arrangement path. |
| Source data | `cn_c3_reported` liability = X; `cn_payment` sum = 0.4 × X. |
| Configuration | `PARTIAL_PAYMENT` detection rule and workflow mapping. |
| User role | Compliance Officer, Compliance Finance User. |
| Expected violations | 1× `PARTIAL_PAYMENT`, severity MEDIUM. Outstanding amount on violation = 0.6 × X. |
| Expected workflow | Verification → Notice with outstanding balance → Case or arrangement offer. |
| Expected notices | Partial-payment demand notice. |
| Expected case outcome | Case only if unresolved. |
| Expected payment / legal path | Arrangement action available. |
| Expected final state | Violation open with correct outstanding; notice generated; no duplicate. |
| Affected tables | `ce_violations` (amount fields), `ce_notices`, `ce_employer_financial_ledger`. |
| Affected routes | Same as D. |
| Evidence | SQL: `SELECT amount_outstanding FROM ce_violations WHERE payer_id='UATB1005' ...` equals expected. |

---

### Scenario F — Late Payment (`UATB1006`)

| Field | Value |
|---|---|
| Business purpose | Delay penalty applies once; no duplicate on full-payment closure. |
| Source data | Payment posted 10 days late, full amount. |
| Configuration | Late-payment penalty rule (via `ce_penalty_calculations` / rule engine). |
| User role | Compliance Officer, Compliance Finance User. |
| Expected violations | Either **no violation** (if late-payment handled purely as penalty) OR 1× late-payment violation auto-closed on full receipt. Behavior to be recorded from actual config. |
| Expected workflow | Penalty calculation → optional notice → auto-close if paid in full. |
| Expected notices | Penalty notice if configured. |
| Expected case outcome | No case. |
| Expected payment / legal path | Penalty ledger entry only. |
| Expected final state | 0 open violations for the period; 1 penalty row in `ce_penalty_calculations`. |
| Affected tables | `ce_violations`, `ce_penalty_calculations`, `ce_employer_financial_ledger`. |
| Affected routes | `/compliance/employers/statements`, `/compliance/violations/management`. |
| Evidence | SQL of penalty row and closed/absent violation. |

---

### Scenario J — Contribution Gap (`UATB1007`)

| Field | Value |
|---|---|
| Business purpose | Detect missing periods for an actively-employed IP where filings exist on either side of the gap. |
| Source data | Employee active 6 periods; C3 rows for periods 1, 2, **skip 3**, 4, **skip 5**, 6. |
| Configuration | Rule mapped to `NON_FILING` or dedicated contribution-gap detection. |
| User role | Compliance Officer. |
| Expected violations | 1 violation per gap period **or** a single grouped violation per current grouping rule in `ce_case_families.grouping_rule`. No false duplicates against neighboring filed periods. |
| Expected workflow | Verification → Notice → Case if unresolved. |
| Expected notices | Standard non-filing notice referencing exact gap periods. |
| Expected case outcome | Case may group per case-family grouping rule. |
| Expected payment / legal path | Batch 1 does not exercise. |
| Expected final state | Gap violations exactly correspond to periods 3 and 5, not 1/2/4/6. |
| Affected tables | `ce_violations`, `ce_case_families`, `ce_cases`. |
| Affected routes | Same as C. |
| Evidence | SQL: periods on violations = expected set; screenshot of Violation Details showing period range. |

---

## 4. Role-Based Execution Matrix (Batch 1)

| Role | Scenarios exercised | Screens |
|---|---|---|
| Compliance Admin | A (config visibility), C (case existence), all (feature-toggle sanity) | Feature Toggles, Rule Engine, Violation Types. |
| Compliance Manager / Head | B (queue oversight), C (notice approval if configured), D (approvals) | Manager Dashboard, Notices Pending Approval, Case Requests. |
| Compliance Officer | A, B, C, D, E, F, J (verification, notice draft) | Verification Queue, Violation Details, Generate Notice, Case Detail. |
| Compliance Finance User | D, E, F (payment reconciliation view) | Employer Statements, Payment Allocation (read). |
| Reports Viewer | All (dashboard read-only) | Compliance Reports, C3 Compliance report. |
| Restricted User | All (negative — must not see queues) | Attempt direct URL access → expect gate. |

Officer/Inspector, Legal, Waiver roles will be exercised in later batches.

---

## 5. Flow Validation Checklist (per scenario)

For each Batch-1 scenario the executor confirms:
1. Source rows exist as seeded.
2. Detection rule matched (log or DB flag).
3. Violation row created with correct `violation_type_id`, `severity`, `period_from`/`period_to`, `amount_owed`, `payer_id`.
4. No duplicate open violation for same (payer, type, period).
5. Assignment row in `ce_case_assignments` / queue.
6. Officer sees item in Verification Queue.
7. Status transitions permitted only via `violationLifecycleService`.
8. Notice generated at correct workflow stage; template selection via existing Communication Hub façade.
9. Case creation only when workflow mapping requires it.
10. Risk score for employer recomputed and reflected on `/compliance/risk/high-risk`.
11. Audit history entries written to `ce_violation_history` / `ce_case_history`.
12. Feature toggle for verification queue and notice generation respected.
13. Direct URL to disabled feature returns `FeatureDisabled` component.

---

## 6. Evidence Deliverables (produced in execution round, not this round)

- `docs/compliance/compliance_e2e_test_data.md` — full seed inventory with IDs.
- `docs/compliance/compliance_end_to_end_execution_report.md` — per-scenario evidence table.
- `docs/compliance/compliance_end_to_end_gap_register.md` — defects and root causes.
- Screenshots stored under `/mnt/documents/compliance-uat/batch1/`.
- SQL evidence stored as CSV under same directory.

---

## 7. Known Pre-Existing Gaps (surfaced during discovery, not this round's target)

| # | Item | Impact on Batch 1 | Owner batch |
|---|---|---|---|
| G1 | `ce_waiver_rules` table is empty | Blocks Scenario P only (Batch 4). Not blocking Batch 1. | Batch 4 |
| G2 | `ce_legal_handoff_rules` has only 1 row | May be insufficient for Scenario Q coverage. | Batch 5 |
| G3 | Seed value `VT-001 / "Autem harum ea vitae"` present in `ce_violation_types` | Data hygiene; does not affect Batch 1 scenarios. | Housekeeping |
| G4 | 4,386 open violations already exist in DB | Requires strict filtering of UAT evidence by `UAT-B1-` reference and seeded employer regnos. | All batches |

---

## 8. Exit Criteria for This Plan Document

Plan is considered ready when:
- All Batch 1 scenarios (A, B, C, D, E, F, J) have complete rows in sections 3–5.
- Test data design covers each scenario's source-data variance.
- Configuration prerequisites are enumerated from existing rows, not proposed.
- Evidence format is defined per scenario.
- No code changes proposed here.

**Status:** ✅ Batch 1 draft complete. Awaiting user go-ahead to (a) seed data, (b) collect role credentials, (c) begin execution and produce evidence, (d) authorize defect fixes at that point.
