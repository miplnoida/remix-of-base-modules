# Compliance UAT — Real Data Pack

Date: 2026-06-01
Source: `ce_violations` joined with `ce_violation_types` (live DB).

Use these **real** employer/period combinations for UAT instead of seeding fake employers (Caribbean Foods Ltd, Island Builders, Nevis Retail Group) which **do not exist** in the system. This avoids polluting `er_master` with synthetic records.

> All entries below are pulled directly from detected violations. Periods are formatted `YYYY-MM` (the `period_from` value).

---

## Cross-scenario employers (good for end-to-end testing)

These employers appear under multiple violation types — ideal for testing case grouping, repeat-default logic, and the full enforcement lifecycle:

| Reg No | Employer | Appears in |
|---|---|---|
| 658852 | Fraites, Trevor | LATE_FILING, NON_PAYMENT, PARTIAL_PAYMENT, REPEAT_DEFAULT |
| 100003 | Nevis Island Construction Co | LATE_FILING, NON_PAYMENT, PARTIAL_PAYMENT |
| 661182 | Indian Summer Ltd | LATE_FILING, NON_PAYMENT |
| 655256 | B/stone Hill Fortress Natl. Park Society | LATE_FILING, REPEAT_DEFAULT |
| 100004 | Basseterre Financial Svcs | NON_PAYMENT, REPEAT_DEFAULT |
| 100010 | Nevisian Heritage Foundation | NON_PAYMENT, REPEAT_DEFAULT |
| 662636 | Rawat, Gulab Singh | LATE_FILING, PARTIAL_PAYMENT |
| 000003 | Sigrid Ziemann | PARTIAL_PAYMENT, REPEAT_DEFAULT |

---

## 1. LATE_FILING — C3 submitted after due date

| Reg No | Employer | Period | Violation # | Status |
|---|---|---|---|---|
| 662636 | Rawat, Gulab Singh | 2026-05 | VIO-20260504-8EEE2FAA | OPEN |
| 661182 | Indian Summer Ltd | 2026-05 | VIO-20260504-5B223D01 | OPEN |
| 658852 | Fraites, Trevor | 2026-05 | VIO-20260504-294D194B | OPEN |
| 655256 | B/stone Hill Fortress Natl. Park Society | 2026-05 | VIO-20260504-5D303093 | OPEN |
| 100003 | Nevis Island Construction Co | 2026-05 | VIO-20260504-3746173F | OPEN |

## 2. NON_FILING — No C3 submitted for required period

| Reg No | Employer | Period | Violation # | Status |
|---|---|---|---|---|
| 659543 | OJ's Euro Shutters St. Kitts Ltd | 2026-05 | VIO-20260504-83617E9C | OPEN |
| 659540 | Frigate Bay Golf Limited | 2026-05 | VIO-20260504-D12C5C85 | OPEN |
| 659518 | Yang Wan Qiang | 2026-05 | VIO-20260504-E56D80E2 | OPEN |
| 659505 | Innovative Transport Services Ltd. | 2026-05 | VIO-20260504-B1F0FA48 | OPEN |
| 659497 | St. Kitts Nevis Tourism Authority | 2026-05 | VIO-20260504-1F4CE9EE | OPEN |

## 3. NON_PAYMENT — C3 filed, zero payment received

| Reg No | Employer | Period | Violation # | Status |
|---|---|---|---|---|
| 658852 | Fraites, Trevor | 2026-04 | VIO-20260414-F50FB20A | OPEN |
| 100010 | Nevisian Heritage Foundation | 2026-04 | VIO-20260412-9764285C | OPEN |
| 661182 | Indian Summer Ltd | 2026-04 | VIO-20260412-13EE59E8 | OPEN |
| 100003 | Nevis Island Construction Co | 2026-04 | VIO-20260412-DDFEC419 | OPEN |
| 100004 | Basseterre Financial Svcs | 2026-04 | VIO-20260412-494C82A7 | OPEN |

## 4. PARTIAL_PAYMENT — Paid less than amount due

| Reg No | Employer | Period | Violation # | Status | Amount |
|---|---|---|---|---|---|
| 662636 | Rawat, Gulab Singh | 2026-04 | VIO-20260414-5F478D6E | ESCALATED | 0.00 |
| 000003 | Sigrid Ziemann | 2026-04 | VIO-20260412-8D1A8638 | OPEN | 0.00 |
| 658852 | Fraites, Trevor | 2026-04 | VIO-20260412-FEE42884 | OPEN | 0.00 |
| 100003 | Nevis Island Construction Co | 2025-10 | VIO-2025-00006 | ESCALATED | 12,726.75 |
| 100008 | Leeward Islands Transport | 2025-10 | VIO-2025-00010 | ESCALATED | 16,411.65 |

## 5. REPEAT_DEFAULT — Multiple prior violations in rolling window

| Reg No | Employer | Period | Violation # | Status |
|---|---|---|---|---|
| 100004 | Basseterre Financial Svcs | 2026-04 | VIO-20260412-B141C6CB | ESCALATED |
| 000003 | Sigrid Ziemann | 2026-04 | VIO-20260412-88112A84 | UNDER_REVIEW |
| 658852 | Fraites, Trevor | 2026-04 | VIO-20260412-B72CF7EF | UNDER_REVIEW |
| 655256 | B/stone Hill Fortress Natl. Park Society | 2026-04 | VIO-20260412-0A5FA5A2 | UNDER_REVIEW |
| 100010 | Nevisian Heritage Foundation | 2026-04 | VIO-20260412-849350A3 | UNDER_REVIEW |

## 6. EMPLOYEE_DISCREPANCY — Reported headcount mismatch

| Reg No | Employer | Period | Violation # | Status |
|---|---|---|---|---|
| 663716 | Kumson Trading Ltd | 2026-04 | VIO-20260414-BD394A1E | UNDER_REVIEW |
| 663726 | Queen City Bar & Garden Ltd | 2026-04 | VIO-20260414-22F7D920 | UNDER_REVIEW |
| 662772 | Arnisha Agard & Arlene Fyfield | 2026-04 | VIO-20260414-7216A44D | UNDER_REVIEW |
| 662512 | Carty Julian | 2026-04 | VIO-20260414-DB185F77 | UNDER_REVIEW |
| 662288 | Baley Project Management & Construction | 2026-04 | VIO-20260414-43BFE8DD | UNDER_REVIEW |

---

## Notes for testers

- **Do not seed** the sample employers from the legacy manual guide (Caribbean Foods Ltd / EMP-CF-001, Island Builders / EMP-IB-002, Nevis Retail Group / EMP-NR-003). They are not in `er_master`.
- All Reg Nos above are real `er_master.regno` values.
- Use the **Cross-scenario employers** table when testing case families, merging, and the repeat-default escalation path.
- Detection logic reference:
  - **LATE_FILING**: `cn_c3_reported.date_received > c3_filing_config_periods.due_date`
  - **NON_FILING**: No `cn_c3_reported` row for a required `c3_filing_config_periods` entry
  - **NON_PAYMENT**: C3 exists, sum of valid `cn_payment` (canonical join via `useC3Payments`) = 0
  - **PARTIAL_PAYMENT**: Sum of valid payments < total due on C3
  - **REPEAT_DEFAULT**: ≥ N prior violations in rolling window per `ce_detection_rules`
  - **EMPLOYEE_DISCREPANCY**: Reported employee count diverges from prior period / inspection finding
- Refresh this list periodically — `ce_violations` is regenerated by the detection engine.
