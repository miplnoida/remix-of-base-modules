# C3 Ledger Sync

**Route:** `/compliance/admin/settings/c3-ledger-sync`
**Component:** `src/pages/compliance/settings/C3LedgerSync.tsx`
**Sub-section:** Compliance → Admin → Integrations & Ledger
**Generated doc:** `docs/compliance/admin/integrations-ledger/c3-ledger-sync.md`

---

## 1. Purpose

Synchronise **finalised C3 contribution submissions** (from `cn_c3_reported`) into the **compliance ledger** (`ce_employer_financial_ledger`) without modifying the source C3 tables. This screen is the operator-facing console for the C3-to-Ledger posting pipeline.

It allows:
- Previewing C3 records that have not yet produced ledger entries
- Running a **dry-run** to validate what would be posted
- Running a **live sync** to actually post the entries
- Reviewing the historical sync log

This is a **read-from-source / write-to-ledger** integration screen — it does not edit C3 source data.

---

## 2. Business Purpose

C3 declarations (employer monthly contribution returns) are the **source of truth for amounts due**. The Compliance Ledger is the **single source of truth for employer balances**. They must be kept in lock-step, but in a controlled, idempotent, fully auditable way:

- The C3 module continues to own the declaration lifecycle.
- The Ledger module owns the financial posting.
- This screen is the **bridge** that compliance/finance staff use when automation hasn't yet posted records, or when ad-hoc backfill / re-sync is required for a specific employer or period.

---

## 3. Data Tables Used

### Read
| Table / View | Usage |
|---|---|
| `ce_v_c3_unposted_to_ledger` (view) | Pending C3 records not yet posted to the ledger. Drives the "Pending C3 Records" tab. |
| `ce_c3_ledger_sync_log` | Historical sync log. Drives the "Sync Log" tab. |

### Written (only via edge function — never directly from this screen)
| Table | Written by |
|---|---|
| `ce_employer_financial_ledger` | `ce-c3-ledger-sync` edge function (DEBIT entries per fund). |
| `ce_c3_ledger_sync_log` | `ce-c3-ledger-sync` edge function (one row per attempt, success/failure). |
| `ce_ledger_periods` (recompute) | Invalidated in cache after sync; assumed updated server-side via the posting function. |

### Not modified
- `cn_c3_reported`, `cn_c3_director_wages`, `cn_payment*` — these are **protected source tables**; the screen never writes to them.

---

## 4. Validations

The screen itself enforces minimal validation; the **edge function** is the validation authority.

### Client-side (UI)
- Filters `employer_id` (text) and `period` (date) are optional.
- No format validation on `employer_id`.
- "Run Sync Now" and "Dry Run" buttons are disabled while a mutation is in-flight (`syncMutation.isPending`).

### Server-side (edge function `ce-c3-ledger-sync`)
- Idempotency: a C3 record (`payer_id` + `period` + `sequence_no`) is skipped if a successful sync log row already exists.
- Only **finalised C3 records** (Verified / Posted) are eligible. *Assumption / needs confirmation: confirm exact eligibility filter inside the function.*
- Each fund (`SS`, `LEVY`, `EI`, plus penalty buckets) is posted as a separate ledger DEBIT entry.
- Failures are recorded in `ce_c3_ledger_sync_log` with `sync_status = 'failed'` and `error_message` populated.

---

## 5. Actions Available

| Action | UI control | Effect |
|---|---|---|
| Refresh | `Refresh` button | Re-runs the pending and sync-log queries. |
| Preview Pending | `Preview Pending` button | Re-fetches pending C3 records (no side-effects). |
| Dry Run | `Dry Run` button | Calls `ce-c3-ledger-sync` with `dry_run: true`. Returns counts of what would be posted; **no DB changes**. |
| Run Sync Now | `Run Sync Now` button | Calls `ce-c3-ledger-sync` with `dry_run: false`. **Posts ledger entries.** |
| Filter by Employer | `Employer ID` input | Restricts both the pending list and the sync call to `payer_id = X`. |
| Filter by Period | `Period` date input | Restricts both the pending list and the sync call to `period = X`. |

The result of the most recent run is rendered in a summary card with: `processed_count`, `posted_count`, `skipped_count`, `failed_count`, plus a per-record error list.

---

## 6. Services / Hooks / APIs Involved

### React-Query keys
- `['ce_v_c3_unposted', employerFilter, periodFilter]` — pending list
- `['ce_c3_sync_log']` — sync history

### Edge function
- `supabase.functions.invoke('ce-c3-ledger-sync', { body: { employer_id, period, limit, dry_run, triggered_by: 'ADMIN' } })`

### Cache invalidation after sync
- `ce_v_c3_unposted`
- `ce_c3_sync_log`
- `ce_ledger_entries`
- `ce_ledger_periods`

### Notifications
- `sonner` `toast.info` for dry-run results
- `sonner` `toast.success` for posted results
- `sonner` `toast.error` for edge-function failures

No hook in `src/hooks/` is dedicated to this screen — all data access is inline `useQuery` / `useMutation`.

---

## 7. Calling / Dependent Screens

### Upstream (writers to source tables this screen reads from)
- C3 module screens (BEMA → C3 Filing, Cashier → C3 entry) — populate `cn_c3_reported`.

### Downstream (readers of the ledger this screen writes to)
- **Ledger Administration** (`/compliance/admin/settings/ledger-admin`) — period summaries and ledger entries.
- **Ledger Operations Dashboard** (`/compliance/admin/settings/ledger-operations`) — health KPIs include C3 pending count.
- **Ledger Posting Framework (Admin)** (`/compliance/admin/settings/ledger-posting`) — queue and reconciliation.
- **Employer 360 → Statement** (`/compliance/field/employer-360/:id`) — renders ledger entries posted from C3.
- **Employer Financial Statement** screens.

### Sibling
- **Payment Ledger Sync** — counterpart for payments-to-ledger.

---

## 8. Where the Same Tables Are Reused

| Table | Other screens / jobs |
|---|---|
| `ce_employer_financial_ledger` | Ledger Administration, Ledger Posting Admin (`LedgerDrilldownTab`), Employer 360 Statement, Ledger Operations Dashboard (`useStatementReadiness`). |
| `ce_c3_ledger_sync_log` | Read-only here; otherwise only written by the `ce-c3-ledger-sync` edge function. No other UI consumer found. |
| `ce_v_c3_unposted_to_ledger` | Used only by this screen; it is the canonical "what's pending C3-side" view. |

---

## 9. Audit / Logging Behaviour

- **Per-attempt audit** is captured by the edge function in `ce_c3_ledger_sync_log` (employer, period, sequence, status, ledger entry IDs, error, `synced_by`, `synced_at`).
- The screen passes `triggered_by: 'ADMIN'` as the actor — **not the actual user code**. This **violates the project standard** that user identity must be the logged-in `UserCode`. *Risk: needs fix.*
- No write to `system_audit_trail` from this UI.

---

## 10. Notable Risks & Gaps

1. **Hardcoded actor** — `triggered_by: 'ADMIN'` instead of the logged-in user. Breaks identity tracking.
2. **No confirmation dialog** before live sync. A mis-filtered live run posts immediately.
3. **No row-level "post just this one" action** — you can only run by filter or unfiltered.
4. **No row-level link** from a Sync Log row to the resulting ledger entries (despite `ledger_entry_ids` being stored on the log row).
5. **Cross-currency assumption** — UI hardcodes `currency: 'XCD'`; ledger may store entries in other currencies. *Assumption / needs confirmation.*
6. **No pagination** — pending list capped at 200 rows, sync log capped at 100. Large backlogs would be invisible past those limits.
7. **No integration with `ce_posting_queue`** — the modern posting pipeline (used by Ledger Posting Admin / Operations) is queue-based. This screen calls a separate edge function. *Assumption / needs confirmation: clarify whether `ce-c3-ledger-sync` and `LEDGER-C3-POST` are the same posting path or two parallel mechanisms.*
8. **No filtering on Sync Log** — cannot filter by status / employer / period.

---

## 11. Assumptions / Needs Confirmation

- Eligibility filter inside `ce-c3-ledger-sync` (Verified / Posted only).
- Whether penalty fields on `cn_c3_reported` are posted as separate ledger entries or aggregated.
- Whether this screen's pipeline is unified with the `LEDGER-C3-POST` job exposed in Ledger Posting Admin / Operations Dashboard, or a parallel legacy path.
