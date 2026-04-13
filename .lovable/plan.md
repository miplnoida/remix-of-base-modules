

## Fix: C3 Payment Screen Shows Full Amount Instead of Component-Level Balances

### Root Cause

**Format mismatch in `get_c3_component_balances` RPC.**

The `c3_payment_components.period` column stores period as `MM/YYYY` (e.g., `04/2026`), but the RPC parameter `p_period` is passed as `YYYY-MM-01` (e.g., `2026-04-01`).

The comparison on line:
```sql
AND cpc.period = p_period
```
Always fails → paid amounts = 0 → full original amount shown.

### Fix

**Migration SQL** — Convert `p_period` to `MM/YYYY` format inside the RPC before comparing:

```sql
-- Change:
AND cpc.period = p_period

-- To:
AND cpc.period = LPAD(EXTRACT(MONTH FROM p_period::date)::text, 2, '0') || '/' || EXTRACT(YEAR FROM p_period::date)::text
```

### Files to Modify

| File | Change |
|------|--------|
| Migration SQL | Recreate `get_c3_component_balances` — fix period format conversion in the paid-amount subquery |

### Impact

Single-line fix inside the RPC. After this, previously paid component amounts will be correctly deducted and the payment screen will show only outstanding balances per component.

