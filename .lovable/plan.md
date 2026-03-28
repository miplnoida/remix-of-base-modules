

# Batch Closing Screen — Fixes & Enhancements

## Problem Analysis

Three critical bugs prevent batch closing from working, plus the UI needs enhancement to show verified cheque and card transaction details.

### Bug 1: `close_batch` RPC uses non-existent columns
The RPC updates `modified_by` and `modified_at` on `cn_batch`, but those columns don't exist. The correct columns are `posted_by` and `date_posted`.

### Bug 2: `save_batch_card_transactions` RPC uses wrong column name
Line 82 selects `status` instead of `batch_status` from `cn_batch`.

### Bug 3: BatchClosing UI doesn't warn about unverified cheques
No indication when cheques are pending verification — cashier can't see why CHQ totals don't match.

---

## Database Changes (Single Migration)

### 1. Fix `close_batch` RPC
- Change `modified_by = p_user_code, modified_at = now()` → `posted_by = p_user_code, date_posted = now()`
- Keep all existing reconciliation logic (CSH, CHQ from verified cheques, CRD/DRD from `cn_batch_card_total`)
- Return additional info: `unverified_cheque_count` in the result JSON

### 2. Fix `save_batch_card_transactions` RPC
- Change `SELECT status INTO v_batch_status` → `SELECT batch_status INTO v_batch_status`

---

## UI Changes

### `BatchClosing.tsx` — Enhanced Reconciliation View

**Add cheque verification summary:**
- After fetching cheques via `get_batch_cheques_for_verification`, display a warning badge showing count of unverified cheques
- Show verified vs total cheque count in the CHQ row

**Add card transaction detail section:**
- Show individual card machine transactions (from `cn_batch_card_transaction`) as a collapsible detail under the CRD/DRD rows
- Display machine code, machine name, card type, and amount per transaction

**Add transaction detail breakdown card:**
- New "Batch Transactions" card showing all payments in the batch from `cn_payment_header` with receipt numbers, payer info, and amounts — giving the cashier visibility into what makes up the system totals

**Improve status messaging:**
- When CHQ has a variance and unverified cheques exist, show specific message: "X cheques pending verification in Cash Details"
- Link to Cash Details for correction

### Files Modified

| File | Action |
|------|--------|
| New migration SQL | Fix `close_batch` and `save_batch_card_transactions` RPCs |
| `src/pages/cashier/BatchClosing.tsx` | Add cheque verification warnings, card transaction details, transaction breakdown |

