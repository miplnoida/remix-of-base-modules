## Why nothing fires for 657115 (beyond Non-Filing)

Verified directly in the DB for employer **657115 (Aida's Beauty Salon)**:

- `cn_c3_reported` rows: **0**
- `cn_payment_header` rows: **0**
- `ce_payment_arrangements` rows: **0**

So the engine has nothing on which DR-003 (Non-Payment), DR-004 (Short Payment) or DR-006 (Arrangement Breach) can match — only DR-002 (Non-Filing) can legitimately fire. The complaint isn't a rule bug for *that* employer; it's that the simulator never tells you **why** other rules cannot match, and the fact-builder feeding the engine has several hard-coded zeros that prevent rules from ever matching for *any* employer.

## What's actually broken in the engine wiring

In `src/hooks/compliance/useSimulatorData.ts → buildFactsForPeriod` several facts are hard-coded and the engine therefore can never reach a positive verdict:

| Fact | Current value | Rule blocked |
|---|---|---|
| `installmentOverdueDays` | `0` | DR-006 Arrangement Breach |
| `employeeCountObserved` | `0` | DR-009 Under-declared headcount |
| `consecutiveGapCount` / `hasConsecutiveGaps` | `0` / `false` | DR-012 Contribution gaps |
| `hasClearanceCert` | `false` | DR-011 Inactive without clearance (false positive risk) |
| `legalResponseReceived` | `false` | ER-003 Legal escalation |
| `noticeStage` / `daysOpen` | only from open violation row | ER-001/002/003 timing |
| `priorSameTypeViolationsRolling12` | counts **all** types | DR-005 Repeat offender (over-counts) |
| `snapshot.partialCount` | `0` | dashboard counter |
| Payment lookup | `cn_payment_header.cn_payment(*)` nested select | silent join failure on some envs |

Additionally there is **no visible diagnostic** explaining which facts were resolved from real data vs defaulted, so the user can't tell a "no data" outcome from a "rule didn't match" outcome.

## Plan

### 1. Real fact wiring (`useSimulatorData.ts`)

Add these queries in parallel with the existing ones and feed `buildFactsForPeriod`:

- `ce_payment_arrangements` + `ce_payment_arrangement_installments` (or equivalent) → compute `installmentOverdueDays = max(0, today − next_unpaid_due_date)` for the active arrangement, plus `arrangementActive`.
- `ce_inspection_visits` / `ce_inspector_observations` (whichever exists) → `employeeCountObserved` for the period.
- Derive **consecutive gaps** from the last 12 periods of `cn_c3_reported`: walk newest→oldest, count contiguous missing periods, set `consecutiveGapCount` + `hasConsecutiveGaps`.
- `ce_compliance_clearance_certs` (if present) → `hasClearanceCert` valid as of period.
- `ce_notices` latest row → `noticeStage`, `daysOpen = today − notice.created_at` (not violation date), `legalResponseReceived` from `ce_legal_responses` if table exists.
- Fix repeat counter: filter `priorSameTypeViolationsRolling12` per `violation_type_id` of the rule under evaluation. Easiest: pass the full violations array into the engine and let `evaluateDR005` filter by `rule.violation_type_id`.
- Rewrite the payment join to an explicit two-step fetch (`cn_payment_header.payment_id` → `cn_payment` by `payment_id`) and compute `partialCount` correctly: `c3.due > 0 && paid > 0 && paid < c3.due`.
- Replace the inline `payer_id = regno` assumption with the same lookup other modules use — confirm whether `er_master.regno` and `cn_*.payer_id` always match (they appear to in seed data); if not, add a fallback alias map.

### 2. Engine-side correctness (`complianceSimulatorEngine.ts`)

- DR-005: change signature to receive the full violation list and the rule's `violation_type_id`; count only matching type in last 12 months. Same fix lets DR-005 report the *category* correctly.
- DR-011: only flag if `hasClearanceCert === false` **and** clearance lookup actually ran (otherwise mark `SKIPPED — clearance source unavailable`).
- DR-012: emit a clear reason when `hasConsecutiveGaps` is false because data was missing vs because the threshold wasn't met.
- All evaluators: when a required fact came from the default zero, return a third state `'SKIPPED'` (already supported in product engine) instead of `'matched: false'` with a misleading reason. Surface this in `SimulationOutput.warnings`.

### 3. Data Coverage panel (UI)

Add a card under the Compliance Snapshot showing for the selected employer + period:

```text
Data Coverage
  C3 filings (12 mo)     ✓ 7 of 12
  Payments (12 mo)       ✓ 5 headers / 8 installments
  Arrangements           — none
  Inspections            — none
  Notices                ✓ DEMAND (38 days ago)
  Clearance cert         — source unavailable
```

Each row maps to which detection/escalation rules require it; if all rows are "—", the panel tells the user up-front that the only rule that can fire is DR-002.

Implement as a new `<SimulatorDataCoverage>` component fed by the existing `useEmployerComplianceContext` return (extend it with a `coverage` block).

### 4. Per-rule outcome legend

In `SimulationResults.tsx`, add three filter chips: **Matched**, **Not Matched**, **Skipped (no data)**. Today only matched/not-matched is shown and "no data" hides inside the reason text.

### 5. End-to-end verification

- Pick three employers from real data that should hit different rules and verify in DB before running the simulator:
  - One with filings but a known short payment → DR-004
  - One with an active arrangement and a missed installment → DR-006
  - One with ≥ 2 consecutive non-filed periods → DR-002 + DR-012
- Run the simulator with **Scan last 12 months** + **All enabled rules** and confirm matches.
- Document expected vs actual in `docs/compliance/simulator-acceptance.md`.

### 6. Acceptance

- For 657115 the simulator returns DR-002 matches *and* a Data Coverage card stating that DR-003/004/006/009/012 cannot evaluate due to no filings/payments/arrangements/inspections.
- For the three sample employers above each targeted rule matches.
- No detection rule returns "Not Matched" while its underlying fact came from a default zero — it returns "Skipped" with the data-source it needs.
- DR-005 counts only same-type violations.
- TypeScript build passes.

### Out of scope

- Creating real violations from the simulator (stays dry-run).
- Editing rule definitions or thresholds (those stay user-configurable in the existing screens).
- Adding new violation types or new rule codes.
