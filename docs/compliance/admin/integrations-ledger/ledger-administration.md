# Ledger Administration

**Route:** `/compliance/admin/settings/ledger-admin`
**Component:** `src/pages/compliance/settings/LedgerAdministration.tsx`
**Sub-section:** Compliance → Admin → Integrations & Ledger
**Generated doc:** `docs/compliance/admin/integrations-ledger/ledger-administration.md`

---

## 1. Purpose

Operational read-and-act console for the compliance ledger. Provides four tabs:

1. **Period Summaries** — per-employer, per-fund, per-period roll-ups (`ce_ledger_periods`).
2. **Ledger Entries** — raw entries (`ce_employer_financial_ledger`) with filters.
3. **Automation Jobs** — list of `ce_automation_jobs` with manual-trigger buttons for the legacy job names (`PENALTY_ENGINE`, `BREACH_MONITOR`, `RISK_RECALC`).
4. **Run History** — recent rows from `ce_automation_runs`.

This is the **broad-scope** ledger admin view. More specialised screens (Posting Framework, Operations Dashboard) overlap with parts of this UI.

---

## 2. Business Purpose

Compliance and finance officers need a single screen to:
- Verify that period roll-ups match expectations (debits, credits, penalties, interest, payments, waivers, balance).
- Drill into ledger entries when an employer disputes a balance.
- Trigger maintenance jobs (penalty engine, breach monitor, risk recalculation) outside their cron schedule.
- Confirm a job actually ran (Run History).

---

## 3. Data Tables Used

### Read
| Table | Tab | Driven via |
|---|---|---|
| `ce_ledger_periods` | Period Summaries | `useLedgerPeriods()` (in `useComplianceLedger`) |
| `ce_employer_financial_ledger` | Ledger Entries | `useLedgerEntries(filters)` |
| `ce_automation_jobs` | Automation Jobs | inline `useQuery` |
| `ce_automation_runs` | Run History | inline `useQuery` |

### Written
- Indirectly: triggering a job invokes an edge function which writes to `ce_automation_runs`, possibly to `ce_employer_financial_ledger`, `ce_violations`, etc., depending on job type.

---

## 4. Validations

- Filter inputs are free-text / select; no validation.
- `Period` filter expects `YYYYMM` format (placeholder text only — not enforced).
- Trigger buttons mapped to a hardcoded `functionMap`:
  ```
  PENALTY_ENGINE  → ce-penalty-engine
  BREACH_MONITOR  → ce-breach-monitor
  RISK_RECALC     → ce-risk-recalculation
  ```
  Jobs whose `job_code` is not in this map render no trigger button. *Risk: silent unsupported state.*

---

## 5. Actions Available

| Action | Control | Effect |
|---|---|---|
| Search periods | text search box | Client-side filter on `employer_id` + `period`. |
| Filter ledger entries | Employer ID / Fund / Status / Period inputs | Server-side filter via `useLedgerEntries`. |
| Trigger job | Per-job action button (only for the 3 mapped codes) | Calls `triggerJob.mutate({ functionName, body: { triggered_by: 'ADMIN' } })`. |

No edit, delete, or reverse action is exposed on individual ledger entries from this screen.

---

## 6. Services / Hooks / APIs Involved

### Hooks (`src/hooks/useComplianceLedger`)
- `useLedgerEntries(filters)`
- `useLedgerPeriods()`
- `useTriggerAutomationJob()`

### Inline queries
- `['ce_automation_jobs']`
- `['ce_automation_runs']`

### Edge functions (via `useTriggerAutomationJob`)
- `ce-penalty-engine`
- `ce-breach-monitor`
- `ce-risk-recalculation`

### Cache invalidation: handled inside the hook (assumed standard).

---

## 7. Calling / Dependent Screens

### Upstream (writers to the tables this screen reads)
- C3 Ledger Sync, Payment Ledger Sync — produce ledger entries.
- Penalty / Breach / Risk edge functions — produce ledger entries and runs.
- All `LEDGER-*` jobs (visible in Ledger Posting Admin / Operations) — produce entries and queue rows.

### Downstream
- **Ledger Operations Dashboard** — re-reads `ce_automation_runs` (under key `ledger_ops_job_status` via `ce_job_run_log` — *note: different table, see risks*).
- **Ledger Posting Admin** — also lists rebuild/job runs.
- **Employer 360 → Statement** — re-renders the same ledger rows for a single employer.

### Sibling
- Ledger Posting Admin, Ledger Operations Dashboard, Ledger Help & SOP.

---

## 8. Where the Same Tables Are Reused

| Table | Other consumers |
|---|---|
| `ce_employer_financial_ledger` | C3 / Payment Ledger Sync (writers), Ledger Posting Admin (`LedgerDrilldownTab`), Operations Dashboard (`useStatementReadiness`), Employer 360, statement PDFs. |
| `ce_ledger_periods` | Only this screen reads; written by ledger posting RPCs. |
| `ce_automation_jobs` | Job Configuration screen (`/compliance/admin/automation/job-configuration`), Employer Compliance Jobs. |
| `ce_automation_runs` | Job History screen, Employer Compliance Jobs (writes to a parallel `ce_automation_job_runs` — see Batch 4 docs). |

---

## 9. Audit / Logging Behaviour

- Job triggers go through `useTriggerAutomationJob`, which (assumed) writes to `ce_automation_runs`. Confirmed by the Run History tab populating after triggers.
- Hardcoded actor `'ADMIN'` again — **identity gap**.
- No `system_audit_trail` writes from this UI.

---

## 10. Notable Risks & Gaps

1. **Hardcoded `functionMap`** — only 3 job codes can be triggered from this screen. Other jobs (`LEDGER-*`, `EMP-*`) are listed but have **no trigger UI** despite being shown.
2. **Two run-log tables** in the system: `ce_automation_runs` (read here) and `ce_automation_job_runs` (read by Employer Compliance Jobs). This screen does **not** show LEDGER-* job runs that are written to `ce_job_run_log`. Multiple parallel logging surfaces — must be reconciled.
3. **Hardcoded `triggered_by: 'ADMIN'`** — identity gap.
4. **No pagination** — periods view sliced to first 100 client-side after fetching all; ledger entries depend on hook (assumed limited).
5. **No reverse / amend / split entry actions** — read-only for ledger rows.
6. **Currency hardcoded** to `XCD`.
7. **Search is client-side only** — large period sets won't match beyond the loaded set.

---

## 11. Assumptions / Needs Confirmation

- Whether `useLedgerEntries` paginates or caps at 1000 rows.
- Whether `useLedgerPeriods` returns pre-aggregated data or computes client-side.
- Whether the three legacy job codes (`PENALTY_ENGINE` etc.) are still the canonical names or if they've been superseded by `LEDGER-PENALTY-ACCRUAL`.
