

# Fix: Component-Level Payment Balance Reconciliation for C3 Contributions

## Problem

When a cashier navigates to `C3 Payments` from the contribution list with a partial payment scenario, the system **pro-rates** the pending amount proportionally across all components (lines 243-260 in `C3Payments.tsx`). For example, if SSC=1000, LVC=500, PEC=300 and the pending amount is 900, it distributes 900 proportionally as SSC=500, LVC=250, PEC=150 — regardless of which components were actually paid in prior transactions.

The correct behavior: look up `cn_payment` records by `payment_code` for the same payer/period/sequence and subtract what was **already paid per component** from the original reported amount.

## Root Cause

1. **`get_c3_payment_components` RPC** returns full reported amounts from `cn_c3_reported` with zero awareness of prior payments.
2. **Frontend pro-ration** (lines 243-260) distributes a lump `pendingAmount` proportionally — a financial inaccuracy.

## Solution

### Step 1: New RPC — `get_c3_component_balances`

Create a single PostgreSQL function that:
1. Fetches original component amounts from `cn_c3_reported` (same as current RPC)
2. Queries `cn_payment` joined with `cn_payment_header` and `cn_receipt` to aggregate **already-paid amounts per payment_code** for the same `payer_id`, `payer_type`, period, and `sequence_no` (from `c3_payment_components`)
3. Only counts payments where: `cn_payment_header.status != 'deleted'` AND `cn_receipt.status != 'C'`
4. Returns each component with: `original_amount`, `paid_amount`, `balance_amount`
5. Components with `balance_amount = 0` are still returned but marked as fully paid

```sql
CREATE OR REPLACE FUNCTION public.get_c3_component_balances(
  p_payer_id TEXT, p_payer_type TEXT, p_period TEXT, p_sequence_no INTEGER
) RETURNS JSONB ...
```

The paid-amount query logic:
```sql
-- Get valid payment_ids for this payer with non-cancelled receipts and non-deleted headers
SELECT cp.payment_code, SUM(cp.payment_amount) as total_paid
FROM cn_payment cp
JOIN cn_payment_header h ON h.payment_id = cp.payment_id
JOIN cn_receipt r ON r.payment_id = cp.payment_id
WHERE h.payer_id = p_payer_id AND h.payer_type = p_payer_type
  AND h.status IS DISTINCT FROM 'deleted'
  AND r.status != 'C'
  AND cp.period = p_period::timestamp
  AND cp.payment_code IN (component codes for this payer type)
GROUP BY cp.payment_code
```

Additionally, cross-reference `c3_payment_components.sequence_no` to ensure payments are matched to the correct schedule number for Employer/NWD payers.

### Step 2: Update `C3Payments.tsx` — Replace Pro-Ration with Balance Lookup

**Remove** the proportional distribution block (lines 241-260).

**Replace** the call from `get_c3_payment_components` to `get_c3_component_balances`. The new RPC returns balance amounts directly, so the frontend simply uses `balance_amount` as the component amount.

Components with `balance_amount <= 0` are excluded from the payment screen (fully paid).

The `maxAmounts` map is set to `balance_amount` per component (not original amount), preventing overpayment.

### Step 3: Update `ExistingPaymentsPopup.tsx` — Remove `pendingAmount` Pass-Through

Since the new RPC handles per-component reconciliation server-side, the `pendingAmount` parameter is no longer needed. The `onContinueToPayment` callback no longer passes a lump pending amount. The C3 Payments screen will always call the balance RPC to get accurate per-component outstanding amounts.

Update the navigation state from all three list screens (`C3ContributionList`, `NwDirectorList`, `SelfEmployedContributionList`) to stop passing `pendingAmount`.

### Step 4: Backend Validation in `create_c3_payment_with_receipt`

Add a pre-save validation check inside the existing RPC: before inserting payment lines, verify that each component's amount does not exceed its outstanding balance. This prevents overpayment at the database level even if the frontend is bypassed.

```sql
-- For each component in p_components:
-- Calculate current balance = original - already_paid
-- If component amount > balance, RAISE EXCEPTION
```

## Files Changed

| File | Change |
|------|--------|
| New migration | `get_c3_component_balances` RPC |
| Updated migration | `create_c3_payment_with_receipt` — add overpayment guard |
| `src/pages/cashier/C3Payments.tsx` | Replace `get_c3_payment_components` call with `get_c3_component_balances`; remove pro-ration logic; use `balance_amount` for component amounts and `maxAmounts` |
| `src/components/c3/ExistingPaymentsPopup.tsx` | Remove `pendingAmount` from `onContinueToPayment` callback |
| `src/pages/c3Management/c3Details/C3ContributionList.tsx` | Stop passing `pendingAmount` to navigation state |
| `src/pages/c3Management/c3Details/NwDirectorList.tsx` | Stop passing `pendingAmount` to navigation state |
| `src/pages/c3Management/c3Details/SelfEmployedContributionList.tsx` | Stop passing `pendingAmount` to navigation state |

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| No prior payments | Balance = full original amount per component |
| Partial payment on one component | Only that component's balance is reduced |
| Fully paid component | Component excluded from payment screen |
| All components fully paid | Toast: "All components fully paid" — no entry possible |
| Multiple prior transactions | All non-cancelled payments summed correctly |
| Overpayment attempt | Blocked at frontend (maxAmounts) AND backend (RPC validation) |
| Cancelled receipt payments | Excluded from paid total — balance restored |

