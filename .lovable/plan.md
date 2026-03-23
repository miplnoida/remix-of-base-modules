

# Fix Batch Closing: Dynamic MOP Loading & Split Physical/System Display

## Summary

The Batch Closing screen currently hardcodes 4 MOP types (CSH, CHQ, CRD, DRD). The fix will:
1. Fetch all payment methods from `tb_method_of_payment` dynamically
2. Show **Physical Count** for only CSH, CHQ, CRD, DRD (the physically verifiable methods)
3. Show **System Count** for ALL methods from the database (including EFT, MNO, etc.)
4. Validate only the 4 physical-count methods; other methods are informational and never block closing
5. Fix the `close_batch` RPC to also use `tb_currencies` directly for CSH (same bug as the client-side fix already applied)

## Changes

### 1. `src/pages/cashier/BatchClosing.tsx` — Redesign reconciliation UI

- **Fetch MOP list**: Add a query to `tb_method_of_payment` to get all `mop_code` + `short_description` on mount
- **Replace hardcoded `MopTotals` interface**: Use a `Record<string, number>` for system totals so all MOP codes from the DB are included
- **Physical Count section**: Keep showing only CSH/CHQ/CRD/DRD with their physical values
- **System Count section**: Show ALL payment methods from `tb_method_of_payment`, computing system totals for each `mop_code` found in `cn_payment`
- **Reconciliation table**: Compare only the 4 physical MOP codes; show other system-only MOPs in a separate "System Summary" section below (no physical column, no variance, no match indicator — just the system total for informational display)
- **Validation**: `allMatch` checks only CSH/CHQ/CRD/DRD; other MOPs never block closing
- **Labels**: Use `short_description` from `tb_method_of_payment` instead of hardcoded `MOP_LABELS`

### 2. `close_batch` RPC — Fix CSH physical join (migration)

The server-side `close_batch` function still has the broken CSH lookup chain (joins through `cashier_currency_config` instead of `tb_currencies` directly). Update the CSH physical calculation:

```sql
-- Replace the broken join:
--   JOIN cashier_currency_config cfg ON cfg.id = cc.currency_id
--   JOIN tb_currencies tc ON tc.id = cfg.currency_id
-- With direct:
--   JOIN tb_currencies tc ON tc.id = cc.currency_id
```

No other RPC changes needed — the validation in the RPC already only checks CSH/CHQ/CRD/DRD which is correct.

### No other files affected

The `close_batch` RPC already validates only the 4 physical methods server-side, matching the client-side change. The UI is the only file that needs the display overhaul.

