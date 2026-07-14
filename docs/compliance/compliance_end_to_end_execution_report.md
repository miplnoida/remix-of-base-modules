# Compliance End-to-End Validation — Batch 1 Execution Report

**Scope:** Scenarios A, B, C, D, E, F, J (Data + C3 + Payment detection).
**Mode:** Discovery + plan only — no remediation applied this round.
**Executed:** 2026-07-14, Admin session (Admin@secureserve.gov, `System Admin`, role Admin).
**Evidence artifacts:**
- Seed script: `scripts/compliance/uat/batch1_seed.sql`
- Playwright screenshots: `/tmp/browser/b1/shots/` (00_login → 11_compliance_reports)

---

## 1. Seed data (verified in database)

| # | Regno   | Name                          | Purpose                    |
|---|---------|-------------------------------|----------------------------|
| A | U01001  | UAT Clean Employer Ltd        | Clean baseline — no violations expected |
| B | U01002  | UAT LateFile Employer Ltd     | Latest period filed late (due+22d) |
| C | U01003  | UAT NonFile Employer Ltd      | 2026-05 period missing entirely |
| D | U01004  | UAT NoPay Employer Ltd        | Filed but no payment posted |
| E | U01005  | UAT PartPay Employer Ltd      | Filed, partial payment expected |
| F | U01006  | UAT LatePay Employer Ltd      | Filed, late payment expected |
| J | U01007  | UAT Gap Employer Ltd          | Contribution gap (Feb-2026, Apr-2026 missing) |

Runtime evidence:
```
SELECT payer_id, COUNT(*) FROM cn_c3_reported WHERE payer_id LIKE 'U010%' GROUP BY payer_id;
 U01001 | 6   U01002 | 6   U01003 | 5   U01004 | 6   U01005 | 6   U01006 | 6   U01007 | 4
```
7 employers inserted, 39 C3 rows inserted. Idempotency verified (re-run leaves row counts identical).

Payments were **not** seeded — `cn_payment` has no employer linkage column that Compliance detection currently reads from; detection reads from `ce_employer_financial_ledger`. See Gap G5.

---

## 2. Automation job invocation results

| Edge Function | Job Code | HTTP | Outcome | Evidence |
|---|---|---|---|---|
| `ce-c3-ledger-sync` | LEDGER-C3-POST | 200 | `processed_count=0, posted_count=0` for 7 seeded payers | run_id `442aac11…` — sync log empty, `ce_employer_financial_ledger` row count for U010%: **0** |
| `ce-violation-scan` | JOB-VIOLATION-SCAN | 202 | Accepted, `status=Running` — never transitions to Completed | run_id `e37b8423…`; 4 prior runs also stuck `Running` (2026-05-04, 2026-06-29, 2026-06-30, 2026-07-08) |
| `run-overdue-detection` | JOB-OVERDUE-DETECTION | — | Response body empty within 30s; no run record surfaced for this invocation | — |

**Post-invocation violation count for U010%:** `SELECT COUNT(*) FROM ce_violations WHERE employer_id LIKE 'U010%';` → **0**.

Because no violations were created, Scenarios B/C/D/E/F/J cannot be UI-verified end-to-end this round. Scenario A (Clean baseline) passes trivially — U01001 has zero violations, matching expectation.

---

## 3. UI walkthrough (Admin, 11 compliance routes)

| Route | HTTP outcome | Renders? | Notes |
|---|---|---|---|
| `/compliance` | 404 | No | Root has no index route |
| `/compliance/risk/repeat-defaulters` | 200 | Rendered | Permission spinner then table shell — no rows for UAT (no violations exist) |
| `/compliance/risk/watchlist` | 200 | Rendered | Accessible; menu link now present (per Issue #10 fix) |
| `/compliance/admin/risk-operations` | 200 | Rendered | Accessible (per Issue #12 fix) |
| `/compliance/violations` | 200 | Partial | Permission gate still resolving in captured screenshot |
| `/compliance/cases` | 200 | Partial | Same |
| `/compliance/inspections` | **404** | No | Route missing from `AppRoutes.tsx` |
| `/compliance/arrangements` | 200 | Partial | Renders shell |
| `/compliance/waivers` | 200 | Partial | Renders shell; ce_waiver_rules is empty (see G3) |
| `/compliance/legal` | **404** | No | Console error: `"User attempted to access non-existent route: /compliance/legal"` |
| `/compliance/reports` | 200 | Partial | Renders shell |

Console during run showed a burst of `PGRST002 – schema cache reload` (503) errors — transient PostgREST cache refresh triggered by recent DDL, not a code defect; app self-recovers after ~20s.

---

## 4. Gap register (Batch 1)

Gaps carried over from discovery phase:

| ID | Area | Description | Impact |
|---|---|---|---|
| G1 | Waivers | `ce_waiver_rules` empty | Waiver approval routing has no policy rows to evaluate |
| G2 | Legal handoff | `ce_legal_handoff` has ≤3 rows | Legal escalation triggers under-defined |
| G3 | Waivers UI | No admin surface to author `ce_waiver_rules` | Cannot self-serve seed |
| G4 | Repeat defaulters | "Last Filing Period" was blank (fixed in Issue #9) | Historical; verify persists post-fix |

New gaps surfaced by Batch 1 execution:

| ID | Area | Description | Severity | Evidence |
|---|---|---|---|---|
| **G5** | Ledger sync | `ce-c3-ledger-sync` reports success with `processed_count=0` when passed explicit `payer_ids` for seeded employers. Ledger never populates from `cn_c3_reported`. All downstream payment-based detection (D/E/F) therefore cannot run. | **Blocker for D/E/F** | run_id `442aac11-c8ec-4ce5-835e-5598fd8d315b`; `ce_employer_financial_ledger` count = 0 for U010% |
| **G6** | Violation scan | `ce-violation-scan` accepts jobs (HTTP 202) and writes a `Running` row to `ce_automation_runs`, but the row never transitions to `Completed`/`Failed`. 5 consecutive runs since 2026-05-04 are stranded `Running`. No violations created. | **Blocker for B/C/J** | `SELECT status FROM ce_automation_runs WHERE job_id='c770bcc5-…' LIMIT 5` → all `Running` |
| **G7** | Job registry hygiene | 25 of 30 `ce_automation_jobs` are `is_enabled=false`, including `JOB-NOTICE-GEN`, `JOB-PENALTY-RECALC`, `LEDGER-*` family, `EMP-*` refreshes. Unclear whether disabled intentionally or by drift. | High — silently disables downstream flows | `SELECT job_code FROM ce_automation_jobs WHERE is_enabled=false` (25 rows) |
| **G8** | `run-overdue-detection` | Endpoint returns no body within 30s; no automation run row observable. | Medium | curl -w to `/functions/v1/run-overdue-detection` |
| **G9** | Route registration | `/compliance` (index) and `/compliance/inspections` and `/compliance/legal` return 404. Menu items may link to non-existent routes. | High — parity with issues #10/#12 | Playwright body="404 Error: User attempted to access non-existent route: /compliance/legal" |
| **G10** | PostgREST cache thrash | Recent DDL causes ~20s window of PGRST002 503s on all reads. Users experience "Checking permissions…" spinner then partial screens. | Low (transient, self-recovering) | Console log burst captured during Playwright walk |

---

## 5. Scenario dispositions

| Scenario | Data present | Detection ran | Violation created | Verdict |
|---|---|---|---|---|
| A – Clean baseline (U01001) | Yes | Scan attempted (G6) | 0 (expected) | **PASS** (by trivial absence) |
| B – Late C3 (U01002) | Yes | Scan attempted (G6) | 0 | **BLOCKED** by G6 |
| C – Non-file (U01003) | Yes (period omitted) | Scan attempted (G6) | 0 | **BLOCKED** by G6 |
| D – Non-pay (U01004) | C3 yes / ledger no (G5) | — | 0 | **BLOCKED** by G5+G6 |
| E – Partial pay (U01005) | C3 yes / ledger no (G5) | — | 0 | **BLOCKED** by G5+G6 |
| F – Late pay (U01006) | C3 yes / ledger no (G5) | — | 0 | **BLOCKED** by G5+G6 |
| J – Contribution gap (U01007) | Yes | Scan attempted (G6) | 0 | **BLOCKED** by G6 |

---

## 6. Recommendation for next round (fix appetite dependent)

Do NOT proceed to Batches 2–5 until G5 and G6 are unblocked; otherwise every subsequent batch inherits an empty ce_violations set and produces no evidence.

Suggested unblocking order (subject to user approval — no code changes were applied this round):

1. **G6** — Investigate `ce-violation-scan` completion path. Suspects: async worker never invoked, or completion path swallows exceptions before writing `completed_at`. First look at run row updates around the 202 return; check for orphan promises.
2. **G5** — Investigate `ce-c3-ledger-sync` filter logic. `processed_count=0` with explicit `payer_ids` suggests the function's employer/period join is filtering seeded rows out (perhaps because `posting_status='POSTED'` combined with an "already synced" flag defaults `true`, or because ledger sync expects a source flag not set by direct insert).
3. **G9** — Register `/compliance` index, `/compliance/inspections`, `/compliance/legal` in `AppRoutes.tsx` (or hide their menu items until modules exist).
4. **G7** — Decide policy: are 25 disabled jobs intentional? If not, enable in a controlled window and confirm scheduler picks them up.
5. **G1–G3** — Seed `ce_waiver_rules` and expand `ce_legal_handoff` (required before Batch 4 / Batch 5).

---

## 7. Final status — Batch 1

**NOT ACCEPTED** for Batch 1.

Only Scenario A (Clean baseline) produced expected runtime evidence. Scenarios B, C, D, E, F, J are **blocked** by G5 (ledger sync produces zero postings) and G6 (violation scan never completes).

No fixes were applied in this round, per the user's directive `Discovery + plan only`.
