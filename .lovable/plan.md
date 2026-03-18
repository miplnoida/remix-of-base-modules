

# Fix Cash Details Save/Load — Plan

## Problem
The `saveCashCount` function on line 112 of `CashDetails.tsx` is a no-op — it just shows a toast. No database table exists to store cash count data, so nothing is persisted or loaded.

## Solution

### 1. Create `cn_cash_count` Table (Migration)

```sql
CREATE TABLE public.cn_cash_count (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR NOT NULL REFERENCES cn_batch(batch_number),
  currency_id UUID NOT NULL REFERENCES tb_currencies(id),
  denomination_id UUID NOT NULL REFERENCES cashier_currency_denominations(id),
  count INTEGER NOT NULL DEFAULT 0,
  created_by VARCHAR,
  updated_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(batch_number, denomination_id)
);

ALTER TABLE public.cn_cash_count ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage cash counts"
  ON public.cn_cash_count FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

One row per denomination per batch. The `UNIQUE(batch_number, denomination_id)` constraint enables upsert.

### 2. Update `CashDetails.tsx`

**Load on batch select:** When `batchSel.selectedBatch` changes, query `cn_cash_count` filtered by `batch_number` and populate the `denomCounts` state from the results.

**Save:** Replace the dummy `saveCashCount` with a real upsert:
- Collect all non-zero denomination counts from state
- Use `supabase.from('cn_cash_count').upsert(rows, { onConflict: 'batch_number,denomination_id' })`
- Delete rows where count was set back to 0 (clean up)
- Show success only after DB confirms; show error on failure
- Include `updated_by` with the user code from the batch's `entered_by` field
- Add loading state to the Save button

### 3. Files to Modify
- **New migration SQL** — create `cn_cash_count` table
- **`src/pages/cashier/CashDetails.tsx`** — add load query on batch change, replace save with upsert, add saving state

