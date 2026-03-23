

# Fix CSH Physical Count Currency Conversion in Batch Closing

## Root Cause

In `BatchClosing.tsx`, the CSH physical total calculation has a **broken lookup chain**. The `cn_cash_count.currency_id` column stores `tb_currencies.id` (as saved by Cash Details Entry), but Batch Closing incorrectly treats these values as `cashier_currency_config.id` and queries the wrong table first.

**Current (broken) flow:**
1. Read `currency_id` from `cn_cash_count` → gets `tb_currencies.id`
2. Query `cashier_currency_config` WHERE `id` IN (those values) → **wrong table, no match or wrong match**
3. Then query `tb_currencies` using the config's `currency_id` → double indirection, broken

**Correct flow:**
1. Read `currency_id` from `cn_cash_count` → gets `tb_currencies.id`
2. Query `tb_currencies` directly WHERE `id` IN (those values) → get exchange rates directly

## Change

### `src/pages/cashier/BatchClosing.tsx` — Fix CSH physical total calculation

Replace lines 50–79 (the CSH calculation block) to:
- Remove the unnecessary `cashier_currency_config` lookup
- Query `tb_currencies` directly using the `currency_id` values from `cn_cash_count`
- Build the exchange rate map from `tb_currencies` directly
- Apply conversion: base currency rows use rate 1, foreign currency rows multiply by `exchange_rate`

This matches exactly how `CashDetails.tsx` computes `cashPhysicalTotal` (lines 204–212), ensuring both screens produce the same converted total.

### No other changes needed

- CHQ, CRD, DRD calculations are unaffected (they use different tables/logic)
- No backend changes needed — `tb_currencies` already has `exchange_rate` and `is_main_currency`
- No new endpoints required — the fix is correcting which table is queried

