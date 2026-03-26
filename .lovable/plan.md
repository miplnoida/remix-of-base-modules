

# Date-Based Restrictions for Filing & Penalties Configuration

## Current State
- Table `c3_filing_config_periods` exists with `date_from`, `date_to`, overlap validation trigger, and `upsert_filing_config_period` RPC
- Overlap and one-open-ended checks already exist in the trigger `validate_filing_config_period`
- No historical period protection exists — users can freely edit past periods
- No preview/analyze endpoint exists

## Changes

### 1. Database Migration — Two New RPCs

**a) `analyze_filing_config_change(p_id, p_date_from, p_date_to, p_week_start_day, ...)`**
Returns a JSONB analysis:
- Checks if the target record (for edits) has `date_from < DATE_TRUNC('month', CURRENT_DATE)` → historical period affected
- If historical: returns `{ action: 'split', old_record_end: last_day_prev_month, new_record_start: first_day_current_month, original_values: {...}, new_values: {...} }`
- If not historical: returns `{ action: 'normal' }`
- For new records with `date_from < 1st of current month`: returns `{ action: 'split' }` with same split logic
- Also pre-validates overlap and open-ended constraints, returning `{ action: 'error', message: '...' }` if invalid

**b) Replace `upsert_filing_config_period`** with enhanced version supporting `p_force_split BOOLEAN`:
- If `p_force_split = false`: validates `date_from >= 1st of current month` for existing records that started before current month, then saves normally
- If `p_force_split = true`:
  1. Closes old record: `UPDATE SET date_to = (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE`
  2. Inserts new record: `date_from = DATE_TRUNC('month', CURRENT_DATE)::DATE` with new values
  3. All in one transaction (already atomic within PL/pgSQL)
- Overlap and open-ended validation still enforced by the existing trigger

### 2. Frontend — Hook Updates (`useFilingConfigPeriods.ts`)

- Add `useAnalyzeFilingConfigChange()` mutation that calls `analyze_filing_config_change` RPC
- Update `useUpsertFilingConfigPeriod` to pass `p_force_split` parameter

### 3. Frontend — Split Confirmation Modal (`C3FilingConfigTab.tsx`)

Update `handleSave` flow:
1. Call `analyze_filing_config_change` with form data
2. If response is `action: 'error'` → show toast with error message
3. If response is `action: 'split'` → open confirmation dialog showing:
   - "The existing configuration effective from {date_from} will be closed on {last_day_prev_month}"
   - "A new configuration will be created effective from {1st_current_month} with your updated values"
   - Confirm → call upsert with `force_split: true`
   - Cancel → no action
4. If response is `action: 'normal'` → call upsert directly with `force_split: false`

Add a new `AlertDialog` for the split confirmation with clear before/after summary.

### 4. Types Update (`filingConfigPeriod.ts`)

Add `FilingConfigAnalysis` interface for the analyze RPC response.

## SQL for Live Environment

```sql
-- 1. Analyze RPC
CREATE OR REPLACE FUNCTION public.analyze_filing_config_change(...) RETURNS JSONB ...

-- 2. Replace upsert RPC with p_force_split support  
CREATE OR REPLACE FUNCTION public.upsert_filing_config_period(..., p_force_split BOOLEAN DEFAULT false) RETURNS JSONB ...
```

Full SQL provided in migration file and as standalone queries.

## Files Modified
1. **New migration**: `analyze_filing_config_change` RPC + enhanced `upsert_filing_config_period`
2. `src/types/filingConfigPeriod.ts` — add analysis response type
3. `src/hooks/useFilingConfigPeriods.ts` — add analyze mutation, update upsert params
4. `src/components/admin/c3-configuration/C3FilingConfigTab.tsx` — split confirmation modal + updated save flow

## Edge Cases
- Edit record starting before current month → split triggered, confirmation shown
- Edit record starting in current month → normal save
- Create new period overlapping existing → blocked by trigger with error message
- Create second open-ended record → blocked by trigger
- Split creates new open-ended record when old one already had null date_to → old gets closed, new gets null date_to (no conflict)
- `date_to < date_from` → blocked by trigger

