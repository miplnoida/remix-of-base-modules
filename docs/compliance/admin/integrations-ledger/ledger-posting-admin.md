# Ledger Posting Framework (Admin)

**Route:** `/compliance/admin/settings/ledger-posting`
**Component:** `src/pages/compliance/settings/LedgerPostingAdmin.tsx`
**Sub-section:** Compliance → Admin → Integrations & Ledger
**Generated doc:** `docs/compliance/admin/integrations-ledger/ledger-posting-admin.md`

---

## 1. Purpose

Administrative console for the **queue-based ledger posting framework**. Exposes:

1. **Posting Queue** — `ce_posting_queue` rows (PENDING / PROCESSING / POSTED / FAILED / SKIPPED).
2. **Job Run History** — `ce_job_run_log` rows.
3. **Reconciliation** — `ce_reconciliation_exceptions` rows.
4. **Rebuild** — manage `ce_manual_rebuild_request` rows + trigger `LEDGER-REBUILD` jobs.
5. **Run Jobs** — one-click dry-run / execute for the six `LEDGER-*` jobs.
6. **Ledger Drilldown** — per-employer ledger view from `ce_employer_financial_ledger`.

This is the **technical / SRE** view of the posting pipeline. Ledger Operations Dashboard is the friendlier business view; both share most of the same data.

---

## 2. Business Purpose

The compliance ledger is populated by an **idempotent posting queue**. When something fails — a stuck PROCESSING item, a reconciliation variance, a request to fully rebuild an employer's ledger — admins need:
- Direct visibility of queued work and per-attempt error messages.
- The ability to **rerun** posting jobs scoped to an employer/period.
- A formal **rebuild workflow** that reverses existing entries and re-posts from source.

---

## 3. Data Tables Used

### Read
| Table | Tab |
|---|---|
| `ce_posting_queue` | Posting Queue |
| `ce_job_run_log` | Job Run History |
| `ce_reconciliation_exceptions` | Reconciliation |
| `ce_manual_rebuild_request` | Rebuild |
| `ce_employer_financial_ledger` | Ledger Drilldown |

### Written
| Table | By |
|---|---|
| `ce_manual_rebuild_request` | direct `insert` from this UI when submitting a rebuild |
| All ledger-side tables | indirectly via `run-compliance-job` edge function |

---

## 4. Validations

### Client-side
- **Rebuild dialog** requires `employer_id`. From/To period optional. Reason optional (despite being a free text input — *should arguably be mandatory for audit*).
- Period inputs are free-text `YYYY-MM` placeholders, not enforced.
- Rerun jobs button-locked while `runJob.isPending`.

### Server-side
- Each LEDGER-* job is expected to be idempotent (queue + idempotency key).
- `LEDGER-REBUILD` reverses prior entries before re-posting (per Help Center copy).

---

## 5. Actions Available

| Tab | Action | Effect |
|---|---|---|
| Posting Queue | Filter by status | Re-runs query |
| Job Run History | (read-only) | — |
| Reconciliation | Filter by status | Re-runs query |
| Rebuild | `New Rebuild Request` | Inserts `ce_manual_rebuild_request` row (`requested_by: 'officer'` — hardcoded) and immediately fires `LEDGER-REBUILD` job with the new request id |
| Run Jobs | Per-job `Dry Run` | Calls `run-compliance-job` with `dry_run: true, force: true` |
| Run Jobs | Per-job `Execute` | Calls `run-compliance-job` with `dry_run: false, force: true` |
| Ledger Drilldown | `Search` employer | Loads ledger entries ordered by `posted_at` |

The six exposed `LEDGER-*` jobs:
- `LEDGER-C3-POST` (every 15 min)
- `LEDGER-PAY-POST` (every 15 min)
- `LEDGER-PENALTY-ACCRUAL` (nightly)
- `LEDGER-REVERSAL` (hourly)
- `LEDGER-RECONCILE` (nightly)
- `LEDGER-BACKFILL` (manual)

---

## 6. Services / Hooks / APIs Involved

### Inline hooks (defined inside the file)
- `usePostingQueue(statusFilter)`
- `useJobRunLog()`
- `useReconExceptions(statusFilter)`
- `useRebuildRequests()`
- `useRunLedgerJob()` → `supabase.functions.invoke('run-compliance-job', …)`

### Direct DB write
- `supabase.from('ce_manual_rebuild_request').insert(...)` — from `submitRebuild()`.

### Edge function
- `run-compliance-job` — single dispatcher for all `LEDGER-*` codes.

### Cache invalidation (after job)
- `ce_posting_queue`, `ce_job_run_log`, `ce_recon_exceptions_admin`.

---

## 7. Calling / Dependent Screens

### Upstream
- Source-system writers (C3 module, Cashier module) → produce records consumed by `LEDGER-C3-POST` and `LEDGER-PAY-POST`.

### Downstream
- **Ledger Operations Dashboard** — uses the **same** queue/recon/run-log tables for a higher-level dashboard.
- **Ledger Administration** — uses different run-log table (`ce_automation_runs`); does not see `ce_job_run_log`.
- **Ledger Help & SOP** — references all the actions exposed here.
- **Employer 360 → Statement** — final consumer of the ledger entries this framework posts.

---

## 8. Where the Same Tables Are Reused

| Table | Other consumers |
|---|---|
| `ce_posting_queue` | Ledger Operations Dashboard (KPIs and Queue Monitor tab). |
| `ce_job_run_log` | Ledger Operations Dashboard (`useJobRunStatus`). **Not** read by Ledger Administration. |
| `ce_reconciliation_exceptions` | Ledger Operations Dashboard. |
| `ce_manual_rebuild_request` | Ledger Operations Dashboard `useStatementReadiness`. |
| `ce_employer_financial_ledger` | All ledger screens, Employer 360, statement PDFs. |

---

## 9. Audit / Logging Behaviour

- Every job invocation writes to `ce_job_run_log` (handled server-side).
- Rebuild requests write to `ce_manual_rebuild_request` with **hardcoded `requested_by: 'officer'`** — comment in code explicitly says *"will be replaced with actual user"*. **Identity gap, acknowledged in code.**
- No write to `system_audit_trail` from this UI.

---

## 10. Notable Risks & Gaps

1. **`requested_by: 'officer'` placeholder** in rebuild insert — explicitly marked TODO in code.
2. **Reason field on rebuild** is optional; for an action this destructive, it should be mandatory and trigger a confirmation modal showing what will be reversed.
3. **`force: true`** is always passed when running jobs from this screen — bypasses the activation guardrails described in the Job Configuration docs.
4. **Two run-log surfaces** — this screen reads `ce_job_run_log`; Ledger Administration reads `ce_automation_runs`. The two must be unified or clearly partitioned.
5. **Stuck PROCESSING items** — Help Center mentions these may need manual reset; there is **no UI action** here to clear them.
6. **Drilldown** loads with a default limit of 1000 implicit (Supabase default). Long-lived employers will exceed this — *needs explicit pagination*.
7. **Reconciliation tab is read-only** — no resolve / acknowledge action.

---

## 11. Assumptions / Needs Confirmation

- That `LEDGER-REBUILD` writes back to `ce_manual_rebuild_request.status` and `outcome_summary` on completion.
- Whether `force: true` differs in semantics from Job Configuration's force re-run.
- Whether the rebuild reversal is soft (status flip) or hard (DB delete) — Help Center implies soft.
