# Legal Relationship Audit (ERP-01 · Part 1)

Date: 2026-07-03
Scope: All Legal-module entities delivered through EPIC-02 → EPIC-07.
Method: Introspection of `information_schema` FKs + row-level orphan queries + code review of context providers and services.

---

## 1. Entity → Anchor Map

Every operational Legal entity anchors to `lg_case` (single case aggregate). Advisory work anchors to `la_matter`. Reference/master rows anchor to `core_reference_*` or `lg_court*`. This gives the module **one aggregate root per lifecycle** and avoids cross-aggregate coupling.

| Domain | Table | Anchor | Cardinality |
|---|---|---|---|
| Case | `lg_case` | — | root |
| Intake | `lg_case_intake` | `lg_case` (1:1 on qualify) | 1..* until promoted |
| Referral (inbound) | `bn_legal_referral`, `ce_legal_referrals`, `core_legal_referral_item` | `lg_case_intake` | N:1 |
| Parties | `lg_case_party` | `lg_case` | 1:N |
| Liabilities | `lg_recoverable_liability` | `lg_case` | 1:N |
| Hearings | `lg_hearing` | `lg_case` (+ `next_hearing_id` self-FK) | 1:N |
| Orders | `lg_order` | `lg_case` | 1:N |
| Consent Order | `lg_consent_order` | `lg_order` (1:1) | 1:1 |
| Consent Installments | `lg_consent_installment` | `lg_consent_order` | 1:N |
| Settlements | `lg_settlement` | `lg_case` | 1:N |
| Appeals | `lg_appeal` | `lg_order` | 1:N |
| Enforcement | `lg_enforcement_action` | `lg_case` + `lg_order` | N:1 both |
| Court Filings | `lg_court_filing` | `lg_case` | 1:N |
| External Counsel | `lg_external_counsel` → engagement → invoice | `lg_case` (via engagement) | 1:N |
| Legal Costs | `lg_legal_cost` | `lg_case` | 1:N |
| Recovery Assignment | `lg_recovery_assignment` | `lg_case` | 1:N |
| Fees | `lg_fee_charge` | `lg_case` | 1:N |
| Judgment Compliance | `lg_judgment_compliance` | `lg_order` | 1:1 |
| Documents | `lg_document_link` | polymorphic (case / hearing / order / settlement / fee) | 1:N |
| Tasks | `lg_case_task` | `lg_case` | 1:N |
| Timeline | `lg_case_activity` | `lg_case` | 1:N |
| Audit | `lg_case_task_audit`, `lg_liability_audit`, `lg_court_filing_audit`, `lg_consent_order_audit`, `lg_judgment_compliance_audit`, `lg_legal_cost_audit`, `lg_case_intake_audit`, `lg_recovery_assignment_audit` | domain row | 1:N |

Cross-module anchors (read-only reference on the Legal side):

- `au_er_master` (Employer), `au_ip_master` / `ip_master` (Insured Person) — referenced by `employer_id` / `insured_person_id` **without** a physical FK (protected-source policy).
- `core_payment_arrangement` — linked from `lg_payment_arrangement_link`.
- `ce_arrears_ledger`, `bn_overpayment` — linked from `lg_recoverable_liability.source_record_id` (soft link).

---

## 2. Junction Tables (Liability ↔ Domain Object)

The retrofit (EPIC-06A.2) established explicit N:N junctions so a single liability can be affected by many hearings/orders/settlements/etc. All eight are present and each has FKs on both sides:

| Junction | Left | Right |
|---|---|---|
| `lg_hearing_liability` | `lg_hearing` | `lg_recoverable_liability` |
| `lg_order_liability` | `lg_order` | `lg_recoverable_liability` |
| `lg_settlement_liability` | `lg_settlement` | `lg_recoverable_liability` |
| `lg_appeal_liability` | `lg_appeal` | `lg_recoverable_liability` |
| `lg_enforcement_liability` | `lg_enforcement_action` | `lg_recoverable_liability` |
| `lg_consent_liability` | `lg_consent_order` | `lg_recoverable_liability` |
| `lg_arrangement_liability` | `lg_payment_arrangement_link` | `lg_recoverable_liability` |
| `lg_filing_liability` | `lg_court_filing` | `lg_recoverable_liability` |
| `lg_cost_liability` | `lg_legal_cost` | `lg_recoverable_liability` |
| `lg_document_liability` | `lg_document_link` | `lg_recoverable_liability` |
| `lg_task_liability` | `lg_case_task` | `lg_recoverable_liability` |
| `lg_recovery_assignment_liability` | `lg_recovery_assignment` | `lg_recoverable_liability` |

Cardinality verified as N:N with the `UNIQUE(left_id, liability_id)` composite key on each.

---

## 3. Orphan & Integrity Scan Results

Run against production (2026-07-03):

| Check | Result |
|---|---|
| `lg_recoverable_liability` with unknown `lg_case_id` | **0** |
| `lg_hearing` with unknown `lg_case_id` | **0** |
| `lg_order` with unknown `lg_case_id` | **0** |
| `lg_case_task` with unknown `lg_case_id` | **0** |
| `lg_settlement` with unknown `lg_case_id` | **0** (2 rows total) |
| `lg_document_link` with all polymorphic anchors null | **0** |
| Duplicate `(lg_case_id, liability_id)` in junctions | **0** on all 12 junctions |
| Circular `lg_hearing.next_hearing_id` chain | **0** (self-FK, DAG verified) |

Data volume in Live: 20 cases, 0 liabilities, 3 hearings, 2 orders, 2 settlements, 21 fee charges.

## 4. Foreign Key Coverage

All `lg_*` operational children have a physical FK to their parent aggregate. Sample verified constraints:

- `lg_hearing_lg_case_id_fkey`, `lg_order_liability_liability_id_fkey`, `lg_consent_order_order_id_fkey`, `lg_court_proceeding_lg_case_id_fkey`, `lg_document_link_lg_case_id_fkey`, `lg_fee_charge_lg_case_id_fkey`, `lg_enforcement_action_order_id_fkey`, `lg_hearing_next_hearing_id_fkey`.

**Gaps (informational, not blocking):**

- `lg_recoverable_liability.employer_id / insured_person_id` — intentionally FK-less (protected-source policy against `au_er_master` / `ip_master`).
- `lg_case_intake.source_record_id` — polymorphic; resolved via `source_module` discriminator.
- `lg_document_link.storage_object_id` — external DMS ID, not a DB reference.

## 5. Index Review

Verified indexes present on every FK column used in hot-path filters (case-360, calendar, workbenches):

- `lg_case_task(lg_case_id, status)`, `lg_hearing(lg_case_id, start_at)`, `lg_order(lg_case_id, status)`, `lg_recoverable_liability(lg_case_id)`, `lg_fee_charge(lg_case_id, status)`, `lg_case_activity(lg_case_id, ts DESC)`, `lg_document_link(lg_case_id)`.

**Recommended additions (Medium priority):**

- `lg_recoverable_liability(employer_id, legal_status)` — used by Recovery Workbench filters.
- `lg_case_activity(entity_type, entity_id)` — polymorphic timeline lookups.
- `lg_recovery_assignment(assignee_id, status)` — My Work queue.

## 6. Circular Reference Scan

Only self-FKs are `lg_hearing.next_hearing_id` and `lg_recoverable_liability.merged_into_id` / `split_from_id`. All are one-directional (child → predecessor) and acyclic in Live data.

## 7. Summary

| Metric | Value |
|---|---|
| Aggregate roots | 2 (`lg_case`, `la_matter`) |
| Physical FKs on `lg_*` | 130+ |
| Orphan rows across audited tables | **0** |
| Duplicate junction rows | **0** |
| Missing FK gaps (by policy) | 3 (protected sources / DMS / polymorphic) |
| Recommended new indexes | 3 |

**Verdict: PASS.** No blocking relationship defects. Add the 3 recommended indexes before go-live.
