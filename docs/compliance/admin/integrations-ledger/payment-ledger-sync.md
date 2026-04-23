# Payment Ledger Sync & Allocation

**Route:** `/compliance/admin/settings/payment-ledger-sync`
**Component:** `src/pages/compliance/settings/PaymentLedgerSync.tsx`
**Sub-section:** Compliance → Admin → Integrations & Ledger
**Generated doc:** `docs/compliance/admin/integrations-ledger/payment-ledger-sync.md`

---

## 1. Purpose

Synchronise **finalised employer payments** (from `cn_payment` / `cn_receipt` chain) into the compliance ledger as CREDIT entries, and **allocate** those credits against outstanding dues (period × fund) on the employer's account.

Two distinct but related operations live on the same screen:
1. **Sync** — copy finalised payments into the ledger as posted credits.
2. **Allocate** — distribute a posted credit against specific dues (oldest-first, exact-period, dues-then-penalty, or arrangement-priority).

A reconciliation tab surfaces variances detected by `ce_v_payment_reconciliation_exceptions`.

---

## 2. Business Purpose

The cashier subsystem owns **payment receipt**. The compliance ledger owns **what an employer owes vs has paid**. Bridging the two requires:
- A controlled, idempotent posting flow (so duplicate ledger credits cannot occur).
- A configurable **allocation policy** because employers rarely earmark payments to specific funds/periods.
- A reconciliation feedback loop so over-allocation, cancelled-source-with-active-credit, and under/over-amount mismatches are visible to compliance staff.

This screen is the operator console for all three concerns.

---

## 3. Data Tables Used

### Read
| Table / View | Tab | Usage |
|---|---|---|
| `ce_v_payments_unposted_to_ledger` (view) | Pending Payments | Payments not yet copied to the ledger. |
| `ce_payment_ledger_sync_log` | Sync Log | One row per sync attempt. |
| `ce_payment_allocations` | Allocations | One row per allocation decision (payment → due). |
| `ce_v_payment_reconciliation_exceptions` (view) | Exceptions | Detected variances. |

### Written (server-side via RPCs)
| Table | RPC |
|---|---|
| `ce_employer_financial_ledger` (CREDIT entries) | `ce_sync_payments_to_ledger` |
| `ce_payment_ledger_sync_log` | `ce_sync_payments_to_ledger` |
| `ce_payment_allocations` | `ce_allocate_employer_payment` |
| `ce_employer_financial_ledger` (allocation cross-references) | `ce_allocate_employer_payment` *(assumption)* |

### Not modified
- `cn_payment`, `cn_receipt`, `cn_payment_header`, `cn_batch` — protected source tables.

---

## 4. Validations

### Client-side
- All filters optional (`employer_id`, `date_from`, `date_to`).
- `Allocation Mode` only visible when `Auto-Allocate` switch is on.
- Buttons disabled while `syncing` state is true.

### Server-side (RPC `ce_sync_payments_to_ledger`)
- Idempotency by `source_payment_id` — already-synced payments skipped.
- Only payments in final receipt status (assumed `'A'` / Verified, per memory standards) are eligible.
- Reversed/cancelled source payments produce reversal events rather than new credits. *Assumption / needs confirmation.*

### Server-side (RPC `ce_allocate_employer_payment`)
- Allocation mode must be one of: `oldest_due_first`, `exact_period_match`, `dues_then_penalty`, `arrangement_priority`.
- Will not allocate more than the unallocated remainder of the source payment.
- Returns `error` field in response if the payment is already fully allocated, the employer mismatches, or no eligible dues exist.

---

## 5. Actions Available

| Action | Control | Effect |
|---|---|---|
| Run Sync / Preview Sync | `Run Sync` button (label flips with `Dry Run` switch) | Calls `ce_sync_payments_to_ledger` RPC. |
| Toggle Dry Run | `Dry Run` switch | When on, RPC reports counts but does not post. |
| Toggle Auto-Allocate | `Auto-Allocate` switch | Currently a UI-only flag; **not passed to the sync RPC** in code. *Risk.* |
| Choose Allocation Mode | `Allocation Mode` select | Used for ad-hoc per-payment allocation only. |
| Allocate (per row) | `Allocate` button on Sync Log row | Calls `ce_allocate_employer_payment` for that `source_payment_id`. Only visible when `sync_status = posted` and `allocation_status = unallocated`. |
| Refresh tabs | Per-tab refresh icon | Re-fetch the relevant query. |

---

## 6. Services / Hooks / APIs Involved

### React-Query keys
- `['ce_pending_payments', employerFilter, dateFrom, dateTo]`
- `['ce_payment_sync_log']`
- `['ce_payment_allocations']`
- `['ce_payment_recon_exceptions']`

### RPCs
- `ce_sync_payments_to_ledger(p_employer_id, p_payment_date_from, p_payment_date_to, p_limit, p_dry_run, p_triggered_by)`
- `ce_allocate_employer_payment(p_source_payment_id, p_employer_id, p_allocation_mode, p_triggered_by)`

### No dedicated hook file — all logic inline.

### Notifications
- `sonner` toasts for sync result, allocation result, and errors.

---

## 7. Calling / Dependent Screens

### Upstream
- Cashier → Payment Entry, Batch Management — produce `cn_payment` / `cn_receipt`.
- Cashier → Batch posting (Supervisor) — only **closed/posted** batches' payments become eligible (per project memory `payments/management-and-financial-integrity`).

### Downstream
- **Ledger Administration** — surfaces the resulting ledger CREDIT entries.
- **Ledger Operations Dashboard** — KPI `Pending Payment Postings` reads `ce_posting_queue` (related but distinct pipeline — see risks).
- **Employer 360 → Statement** — credits visible in employer running balance.
- **Payment Reconciliation Service** (`src/services/compliance/paymentReconciliationService.ts`) — programmatically uses overlapping primitives (`ce_payment_arrangements`, `ce_installments`).
- **Compliance → Field → Payment Arrangements** screens — consume allocations against arrangements.

### Sibling
- **C3 Ledger Sync** — debit-side counterpart.

---

## 8. Where the Same Tables Are Reused

| Table | Other consumers |
|---|---|
| `ce_employer_financial_ledger` | All ledger admin/operations screens, Employer 360, statement renderers. |
| `ce_payment_allocations` | Payment Reconciliation Service (`paymentReconciliationService.ts`) and arrangement detail views. |
| `ce_payment_ledger_sync_log` | Only this screen (UI). RPC writes elsewhere. |
| `ce_v_payment_reconciliation_exceptions` | Only this screen — but the underlying `ce_reconciliation_exceptions` table is also read by `LedgerOperationsDashboard` and `LedgerPostingAdmin`. |

---

## 9. Audit / Logging Behaviour

- Sync attempts logged to `ce_payment_ledger_sync_log` (status, snapshot amount, allocation status, `synced_by`, `synced_at`).
- Allocations logged to `ce_payment_allocations` (mode, allocated total, `allocated_by`, `allocated_at`).
- **Actor passed as hardcoded `'ADMIN'`** — same identity-tracking gap as C3 Ledger Sync. **Violates the user-identity standard.**
- No write to `system_audit_trail` from this UI.

---

## 10. Notable Risks & Gaps

1. **`autoAllocate` switch is dead code** — its state is never sent to the sync RPC. Either the RPC needs an `auto_allocate` parameter or the switch must be removed.
2. **Hardcoded `triggered_by: 'ADMIN'`** in both RPC calls — must use logged-in `UserCode`.
3. **No confirmation dialog** for live sync or live allocation.
4. **Two reconciliation surfaces** — this screen's `Exceptions` tab uses `ce_v_payment_reconciliation_exceptions`; `LedgerPostingAdmin` and `LedgerOperationsDashboard` use `ce_reconciliation_exceptions` directly. *Need to confirm the view simply wraps the table.*
5. **Two posting pipelines** — this screen uses RPC `ce_sync_payments_to_ledger`; the Ledger Operations / Posting framework uses queue-based job `LEDGER-PAY-POST` via the `run-compliance-job` edge function. **It is unclear whether they are unified or parallel paths.** *Assumption / needs confirmation — high priority.*
6. **No DB-level constraint visible from UI** preventing double-allocation if two operators click `Allocate` simultaneously. Server-side RPC is presumed atomic. *Needs confirmation.*
7. **No pagination** (limits: pending 100, log 100, allocations 200, exceptions 200).
8. **Currency formatting** uses raw `.toFixed(2)` with no currency symbol — inconsistent with C3 Ledger Sync which uses `XCD`.

---

## 11. Assumptions / Needs Confirmation

- Eligibility predicate inside `ce_sync_payments_to_ledger` (receipt status, batch posted, not cancelled).
- Whether the `ce_v_payments_unposted_to_ledger` view excludes payments already in `ce_posting_queue` to avoid double-posting between this RPC and `LEDGER-PAY-POST` job.
- Whether `ce_allocate_employer_payment` writes any cross-reference into `ce_employer_financial_ledger` rows (e.g., linking the credit to the matched debit).
