# Ledger Operations Dashboard

**Route:** `/compliance/admin/settings/ledger-operations`
**Component:** `src/pages/compliance/settings/LedgerOperationsDashboard.tsx`
**Sub-section:** Compliance → Admin → Integrations & Ledger
**Generated doc:** `docs/compliance/admin/integrations-ledger/ledger-operations-dashboard.md`

---

## 1. Purpose

Business-friendly health dashboard for the entire compliance posting pipeline. Surfaces:

- 6 KPI cards (pending C3, pending payments, failed, reversals pending, recon exceptions, statement-ready employer count).
- Statement Readiness summary (ready / incomplete / needs-rebuild / total).
- Quick Job Actions for the 6 `LEDGER-*` jobs with last-run status.
- Queue Monitor (with per-row retry).
- Job Run Status (latest per job, color-coded card grid).
- Reconciliation Summary (severity buckets, drill-through to Employer 360).
- Manual Rerun (multi-step guided workflow).

---

## 2. Business Purpose

The Posting Admin screen exposes raw queues and tables; the **Operations Dashboard** is meant for compliance leads, supervisors, and statement-support staff who need:
- A one-screen health pulse (auto-refreshes every 30s for KPIs and job status).
- A retry path on FAILED queue items without leaving the dashboard.
- A drill-through into Employer 360 from a reconciliation exception.

---

## 3. Data Tables Used

### Read
| Table | Hook |
|---|---|
| `ce_posting_queue` | `usePostingHealthKPIs`, `useQueueMonitor` |
| `ce_reconciliation_exceptions` | `usePostingHealthKPIs`, `useReconSummary` |
| `ce_employer_financial_ledger` | `useStatementReadiness` |
| `ce_manual_rebuild_request` | `useStatementReadiness` |
| `ce_job_run_log` | `useJobRunStatus` |

### Written (indirectly)
- `run-compliance-job` edge function → `ce_job_run_log`, `ce_posting_queue`, `ce_employer_financial_ledger`.

---

## 4. Validations

- All inputs (filters, manual-rerun fields) are free-text; no client-side format validation.
- Job runs always passed with `force: true` — bypasses activation guardrails.
- Manual Rerun multi-step flow does not enforce step prerequisites beyond UI gating.

---

## 5. Actions Available

| Section | Action | Effect |
|---|---|---|
| Health Summary | Quick `Dry Run` / `Execute` per LEDGER-* job | `run-compliance-job` |
| Queue Monitor | Filter by status / source | Re-query |
| Queue Monitor | Per-FAILED-row `Retry` button | Re-runs the matching job (`LEDGER-C3-POST` or `LEDGER-PAY-POST`) scoped to that employer |
| Reconciliation Summary | Per-row `Eye` button | Navigates to `/compliance/field/employer-360/:employerId` |
| Manual Rerun | Multi-step guided form | Triggers job(s) with employer/period scope |

KPI cards auto-refresh every 30 seconds via `refetchInterval`.

---

## 6. Services / Hooks / APIs Involved

### Inline hooks (defined in the file)
- `usePostingHealthKPIs` — parallel `Promise.all` of 6 count queries.
- `useQueueMonitor({ status, source })`
- `useJobRunStatus` — dedupes by `job_code`, latest run only.
- `useReconSummary`
- `useStatementReadiness` — combines ledger employers vs failed-postings vs rebuild-pending counts.
- `useRunJob` → `run-compliance-job`.

### React Router
- `useNavigate()` for drill-through to Employer 360.

### Notifications
- `sonner` toasts on job results.

---

## 7. Calling / Dependent Screens

### Upstream
- Same source-system writers as Ledger Posting Admin.

### Downstream / Sibling
- **Employer 360** — drilled into from reconciliation exceptions.
- **Ledger Posting Admin** — sister technical screen; shares queues, run log, rebuild requests, recon table.
- **Ledger Administration** — overlapping but uses the *other* run-log table (`ce_automation_runs`).
- **Ledger Help & SOP** — explains the workflows this dashboard exposes.

---

## 8. Where the Same Tables Are Reused

Identical reuse map to **Ledger Posting Admin** — every table on this screen is also queried there. The two screens are intentionally redundant for different audiences (operator vs admin).

Additionally:
- `ce_employer_financial_ledger` is the central table also read by Ledger Administration, C3 / Payment Ledger Sync, and Employer 360.

---

## 9. Audit / Logging Behaviour

- KPI / job mutations go through `run-compliance-job` which logs to `ce_job_run_log`.
- No actor identity passed in code — relies on edge-function defaulting. *Identity gap.*
- No `system_audit_trail` writes.

---

## 10. Notable Risks & Gaps

1. **`force: true` always** — same guardrail-bypass risk as Posting Admin.
2. **`orphanEmployers` KPI is hardcoded to 0** (`{ count: 0 }` in the Promise.all). The card shows the correct label but the value is meaningless. **Active bug.**
3. **`useStatementReadiness`** caps `ledger_employers` query at 1000 rows — undercounts in any deployment beyond ~1000 active employers. Should be paginated or use a server-side aggregation.
4. **Retry button on FAILED rows** triggers a job scoped only by `employer_id`, which may re-process *other* unrelated pending items for that employer — not just the failed row.
5. **Auto-refresh every 30s** issues 6 parallel count queries each cycle — load implications at scale.
6. **No timezone handling** in date displays (`format(new Date(...), 'dd/MM HH:mm')` — uses browser local time silently).
7. **Manual Rerun workflow** is a guided UI but does not record the rerun reason in `system_audit_trail`. *Needs confirmation that the underlying job logs the reason.*

---

## 11. Assumptions / Needs Confirmation

- Whether `ce_job_run_log` is the canonical run log going forward, vs `ce_automation_runs` and `ce_automation_job_runs` (three tables exist in the codebase).
- Definition of "ready" employer (currently: has POSTED ledger rows AND no FAILED queue rows). May need a positive signal rather than absence.
- Whether the `Manual Rerun` flow should require Supervisor+ approval (cf. memory `planner-approval-workflow`).
