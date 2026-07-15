# Compliance E2E — Batch 3 Execution Report

**Date:** 2026-07-15
**Scope:** Case lifecycle (consolidation) for UAT employers `U01001`–`U01007`.
**Author:** Automated remediation (this run).
**Prereqs cleared:** Batch 1 (ledger sync) ✅, Batch 2 (violations + notices) ✅.

---

## 1. Objective

Convert the 58 Batch 2 violations into the correct grouped Compliance **cases** so
manual testers can exercise the case-lifecycle screens (assignment, correspondence,
inspection, escalation, closure).

Grouping rule under test: `fn_ce_consolidate_violation_to_case(violation_id, actor)`
should place violations under one case per `(employer_id, case_family)` while
respecting the reopen-window and advisory lock semantics defined in the function.

## 2. Actions performed

| # | Action | Result |
|---|--------|--------|
| 1 | Preflight counts (violations / cases) | 58 open violations, 0 cases → confirmed nothing was auto-consolidated in Batch 2 |
| 2 | Loop `fn_ce_consolidate_violation_to_case` over every UAT violation with `case_id IS NULL` | **58 succeeded, 0 failed** (see migration DO block, dated 2026-07-15) |
| 3 | Verify linkage | `linked_violations = 58`, `unlinked_violations = 0` |
| 4 | Verify case grouping | **21 cases** created (7 employers × 3 case families) |

## 3. Case grouping observed

| Employer | FILING | PAYMENT | DECLARATION | Total violations |
|----------|:------:|:-------:|:-----------:|:----------------:|
| U01001 | 6 | 1 | 1 | 8 |
| U01002 | 6 | 1 | 1 | 8 |
| U01003 | 6 | 1 | 1 | 8 |
| U01004 | 6 | 1 | 1 | 8 |
| U01005 | 6 | 1 | 1 | 8 |
| U01006 | 6 | 1 | 1 | 8 |
| U01007 | 8 | 1 | 1 | 10 |
| **Total** | **44** | **7** | **7** | **58** |

All cases opened `2026-07-15`, `status = OPEN`, `priority = LOW`.

## 4. Verification SQL (for testers)

```sql
-- Case count per employer / family
SELECT employer_id, case_family, count(*) AS cases, sum(violation_count) AS total_violations
FROM ce_cases
WHERE employer_id LIKE 'U010%'
GROUP BY employer_id, case_family
ORDER BY employer_id, case_family;

-- Every violation should be linked to exactly one case
SELECT count(*) FILTER (WHERE case_id IS NULL)     AS unlinked,
       count(*) FILTER (WHERE case_id IS NOT NULL) AS linked
FROM ce_violations
WHERE employer_id LIKE 'U010%';

-- Case history should show CASE_CREATED for each new case
SELECT c.case_number, h.action, h.to_status, h.performed_by, h.created_at
FROM ce_case_history h
JOIN ce_cases c ON c.id = h.case_id
WHERE c.employer_id LIKE 'U010%'
ORDER BY c.employer_id, h.created_at;
```

## 5. Manual acceptance checklist

Tester steps in the Compliance UI (`/compliance/cases`):

- [ ] Filter by `employer_id LIKE 'U010%'`; **21 cases** are visible.
- [ ] Each case card shows the correct `case_family` (FILING / PAYMENT / DECLARATION) and violation count matching §3.
- [ ] Open a FILING case for `U01007` → confirm all 8 linked violations render on the Violations tab.
- [ ] From an `OPEN` case, exercise:
      - Manual assignment to an inspector
      - Add a case correspondence entry
      - Trigger an inspection (creates `ce_inspections` row)
      - Move status `OPEN → UNDER_REVIEW → RESOLVED`
- [ ] Confirm each status transition writes a `ce_case_history` row via `fn_ce_case_status_change_trigger`.
- [ ] Existing DRAFT notices from Batch 2 (58 rows) should appear on the case's Notices tab through `ce_case_notices` once the notice-to-case linker is run (Batch 3.2 — not executed in this run; see §7).

## 6. Batch 3 remediation results

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Violations linked to a case | 58 | 58 | ✅ |
| Cases created | ≤21 (grouped) | 21 | ✅ |
| Case history rows (`CASE_CREATED`) | 21 | 21 | ✅ (via trigger; verify SQL above) |
| Idempotency (re-run does not duplicate) | 0 new cases on second run | pending re-run | ⚠ manual re-run recommended |

## 7. Gaps identified (added to gap register)

| ID | Severity | Area | Summary |
|----|----------|------|---------|
| G16 | Medium | Automation | Violation → case consolidation is **not** invoked by `run-notice-generation` or `ce-violation-scan`. Cases only appear after a manual RPC loop or the `ce_trigger_violation_to_case` trigger fires (which requires the trigger to be enabled — needs audit). |
| G17 | Low | Notices↔cases | `ce_case_notices` join table is empty for the 58 Batch 2 notices. A linker (or generation-time linkage) is needed so notices surface on the case screen. |
| G18 | Low | Priority | Every UAT case defaulted to `LOW` priority because violations inherited `priority = LOW`. Confirm whether case severity should be recomputed via `fn_ce_recalculate_case_severity` post-consolidation. |

## 8. Status

**Batch 3 (case consolidation): ✅ Complete.**
Ready for manual acceptance and (once approved) Batch 4 — Arrangements + Waivers.

Files produced:
- Migration `20260715_batch3_consolidate_uat_violations` (DO block; no schema change).
- This report: `docs/compliance/uat/BATCH_3_EXECUTION_REPORT.md`.
