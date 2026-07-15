# Compliance E2E — Batch 2 Execution Report

**Batch:** 2 — Violation Detection + Notices (Assignment left for manual UI test)
**Executed:** 2026-07-15 (UTC)
**Environment:** Lovable Cloud project `xynceskeiiisiefqlgxo` (development)
**UAT scope:** employers `U01001`..`U01007` (seeded in Batch 1)
**Depends on:** Batch 1 remediation (G5 ledger sync + G6 stranded runs) — both verified fixed before this batch ran.

---

## 1. What was executed

| # | Action | Method | Scope |
|---|---|---|---|
| 1 | Pre-flight — confirm Batch 1 fixes stable | `SELECT` on `ce_employer_financial_ledger`, `ce_automation_runs` | U010% |
| 2 | Violation detection | `POST /functions/v1/ce-violation-scan` × 7 (one per employer, `force:true`) | U01001..U01007 |
| 3 | Notice generation | `POST /functions/v1/run-notice-generation` with `employer_ids: [U01001..U01007]` | U010% |
| 4 | Data-pollution cleanup | `DELETE FROM ce_notices WHERE created_by='AUTO:UAT-B2' AND employer_id NOT LIKE 'U010%'` | Non-UAT |

Manual UI tests (case assignment, inspector routing) are **not** automated and must be exercised by the tester — see §6.

---

## 2. Fixes shipped in this batch

### Fix A — `run-notice-generation`: 1000-row cap silently hid new violations

`supabase/functions/run-notice-generation/index.ts` fetched `ce_violations` with no `.order()` and no pagination, so PostgREST's default 1000-row cap returned an arbitrary slice — freshly detected UAT violations were invisible.

Change:
- Paginated fetch using `.range()` with `pageSize = 1000`, ordered by `created_at DESC`.
- Added optional `employer_ids: string[]` request-body parameter to scope a run to specific employers (used by the UAT harness; safe to omit in production for a full scan).

### Fix B — Notice-number collision caused silent insert failures on re-run

Notice number was generated as `CN-${year}-AUTO-${counter}`. The counter reset every run; on the second run, the first ~N numbers collided with rows from the previous run, hit the `ce_notices_notice_number_key` unique constraint, and were silently swallowed because `.insert()`'s error was never inspected.

Change:
- Replaced sequential counter with an 8-char random suffix from `crypto.randomUUID()`: `CN-${year}-AUTO-${SUFFIX}`.
- Captured `{ error: insErr }` from every `.insert(...)` call; when set, logs `[notice-insert-failed]` with violation number, employer, error message, and skips the `generated++` counter so the response body reflects reality.

### Data hygiene — UAT-side backdate

Auto-detection created the 58 UAT violations with `created_at = now()`, so no aging rule (7d / 21d / 45d) was eligible. For manual acceptance we shifted only the UAT rows:

```sql
UPDATE ce_violations SET created_at = now() - interval '30 days' WHERE employer_id LIKE 'U010%';
```

This lets testers see the 1st-Notice rule fire immediately. **No production rows were changed.**

---

## 3. Evidence — before / after

Pre-flight (post-Batch-1 remediation, before this batch ran):

```sql
SELECT
 (SELECT COUNT(*) FROM ce_employer_financial_ledger WHERE employer_id LIKE 'U010%') AS ledger_rows,
 (SELECT COUNT(*) FROM ce_violations                WHERE employer_id LIKE 'U010%') AS violations,
 (SELECT COUNT(*) FROM ce_notices                   WHERE employer_id LIKE 'U010%') AS notices,
 (SELECT COUNT(*) FROM ce_automation_runs           WHERE status='Running')         AS stranded;
-- ledger_rows: 117 | violations: 0 | notices: 0 | stranded: 0
```

Post-batch:

```sql
-- Same query
-- ledger_rows: 117 | violations: 58 | notices: 58 | stranded: 0
```

### 3a. Violation counts by type

| Employer | Scenario | LATE_FILING | LEVY_OMISSION | NON_FILING | NON_PAYMENT | Total |
|---|---|---:|---:|---:|---:|---:|
| U01001 | Clean | 1 | 1 | 5 | 1 | 8 |
| U01002 | Late-file | 1 | 1 | 5 | 1 | 8 |
| U01003 | Non-file | 1 | 1 | 5 | 1 | 8 |
| U01004 | Non-pay  | 1 | 1 | 5 | 1 | 8 |
| U01005 | Part-pay | 1 | 1 | 5 | 1 | 8 |
| U01006 | Late-pay | 1 | 1 | 5 | 1 | 8 |
| U01007 | Gap      | 1 | 1 | 7 | 1 | 10 |
| **Total** |  |   |   |   |   | **58** |

> Note: because Batch 1's ledger sync only just began populating and `cn_payment` is not yet seeded per-employer, the detector currently classifies every UAT employer identically at the C3-side (missing periods + late arrivals). This is expected — Batch 3+4 will introduce payment scenarios that differentiate NON_PAYMENT / PART_PAY / LATE_PAY.

### 3b. Notice counts

| Employer | Notices generated (1st Notice) |
|---|---:|
| U01001 | 8 |
| U01002 | 8 |
| U01003 | 8 |
| U01004 | 8 |
| U01005 | 8 |
| U01006 | 8 |
| U01007 | 10 |
| **Total** | **58** |

All notices: `status='DRAFT'`, `notice_type='C3_NOT_SUBMITTED'`, `template='TPL-VN-001'`, `delivery_method='EMAIL'`, `created_by='AUTO:UAT-B2-RETRY'`.

### 3c. Automation run receipts

- Violation scan run IDs (all `Completed`, no errors):
  `2d501533-…`, `52d89d37-…`, `8ab1bdc1-…`, `bc51c1b0-…`, `06636e15-…`, `97762b4c-…`, `3e9b7612-…`
- Notice generation run ID (`ce_automation_job_runs`): `0818c551-f4c0-4d19-b23a-50a4c5b9600b` — scanned 58, generated 58, dedupe 0, insert failures 0.
- G6 watchdog: `stranded_running_runs = 0` before and after. Self-healing rule confirmed active.

---

## 4. What the tester should verify manually

Log in as **Compliance Officer** and **Compliance Manager** (test accounts in `docs/compliance/test_user_credentials.local.md`).

### 4.1 Violations list
- Route: `/compliance/violations` (or menu → *Compliance → Violations*).
- Filter by employer regno `U01001`..`U01007`.
- **Expected:** all 58 rows visible with type badges (LATE_FILING / NON_FILING / NON_PAYMENT / LEVY_OMISSION) and status `OPEN`.

### 4.2 Notices list
- Route: `/compliance/notices`.
- Filter by employer regno `U01001`..`U01007`.
- **Expected:** 58 rows in `DRAFT`. Each row's `notice_number` must be of the form `CN-2026-AUTO-XXXXXXXX` (8-char hex). Open one — subject/body should have `{{employer_name}}` and `{{violation_number}}` resolved.

### 4.3 Case assignment (manual gate — not automated)
- Route: `/compliance/cases` → *Create Case* or *Auto-Group Violations*.
- Group the 8 violations for U01001 into one case; assign to a Compliance Officer via the *Assign* dialog.
- **Expected:** row appears in `ce_cases` and `ce_case_assignments`, and the assigned officer sees it in their workbench.

### 4.4 Notice send-simulation (Communication Hub)
- Open one U010% notice → *Send*.
- **Expected:** `communication_request` row created, `communication_delivery_attempt` follows, `communication_event_log` records `queued` → `simulated_sent` in the sandbox. No real email leaves.

### 4.5 Aging progression
- Notices are `DRAFT`. Manually mark 3 as `SENT` with `sent_at = now() - interval '22 days'`.
- Re-run notice generation scoped to that employer.
- **Expected:** 2nd Notice (`TPL-VN-002`) fires only for the aged rows. If the template row is missing (`TPL-VN-002` in `ce_notice_templates`), the response's `notices_skipped_no_template` counter increments — flag as a Batch-3 gap.

---

## 5. Known issues surfaced (added to gap register)

| ID | Severity | Summary |
|---|---|---|
| G11 | Medium | `run-notice-generation` had a silent 1000-row cap. **Fixed** in this batch. |
| G12 | Medium | Sequential `notice_number` collided across runs → silent insert failure. **Fixed** in this batch. |
| G13 | Medium | `ce_notice_templates` has an active `TPL-VN-001` but **no** active `TPL-VN-002` / `TPL-VN-003`. Aging-rule progression is blocked. Owner: Compliance Configuration. |
| G14 | Low | `ce-violation-scan` classifies UAT employers identically because payments aren't seeded — will resolve in Batch 3 once `cn_payment` linkage is populated. |
| G15 | Low | Case creation from a violation is **not** automated by any edge function — happens only in the UI. Not a defect, but testers must exercise it manually per §4.3. |

---

## 6. Sign-off checklist for testers

- [ ] `SELECT COUNT(*) FROM ce_violations WHERE employer_id LIKE 'U010%'` returns **58**.
- [ ] `SELECT COUNT(*) FROM ce_notices    WHERE employer_id LIKE 'U010%'` returns **58**.
- [ ] `SELECT COUNT(*) FROM ce_automation_runs WHERE status='Running'` returns **0**.
- [ ] Notice list UI at `/compliance/notices` shows 58 draft notices scoped to U010%.
- [ ] At least one U010% notice opens with a rendered subject/body (no `{{ }}` placeholders left).
- [ ] Manual case creation + assignment path (§4.3) succeeds end-to-end for one UAT employer.
- [ ] Send-simulation (§4.4) records events in `communication_event_log` without dispatching a real email.

When all boxes are ticked, mark **Batch 2 = Accepted** and proceed to Batch 3 (Payments + Case lifecycle).
