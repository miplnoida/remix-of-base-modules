

# Filing & Penalties: Date-Range-Based Configuration

## Current State
- `c3_calculation_config` table stores 5 filing config keys as flat rows: `week_start_day`, `filing_window_unit`, `filing_window_value`, `penalty_initial_threshold`, `penalty_subsequent_threshold`
- Table has `effective_from` and `effective_to` columns but they are unused for lookups
- `config_key` has a `UNIQUE` constraint, preventing multiple records per key with different date ranges
- The UI shows a simple edit-in-place table via `C3ConfigCategoryCard`
- The latest `calculate_c3_contributions` RPC reads filing config from `c3_config_details` (period-based system), NOT from `c3_calculation_config`

## Design Decision

Rather than restructuring the flat `c3_calculation_config` table (which would break the UNIQUE constraint used by all other categories), create a dedicated **filing configuration periods** table. This mirrors how `c3_config_details`/`c3_config_periods` already work for rate configs — a clean, purpose-built date-range table for filing parameters.

```text
c3_filing_config_periods
├── id (UUID PK)
├── date_from (DATE, NOT NULL)
├── date_to (DATE, nullable = open-ended)
├── week_start_day (INTEGER)
├── filing_window_unit (INTEGER)
├── filing_window_value (INTEGER)
├── penalty_initial_threshold (INTEGER)
├── penalty_subsequent_threshold (INTEGER)
├── is_active (BOOLEAN)
├── created_by, created_at, updated_by, updated_at
└── CONSTRAINT: no overlapping date ranges
```

## Changes

### 1. Database Migration

**a) New table** `c3_filing_config_periods` with all 5 filing parameters as columns, plus `date_from`, `date_to`, audit columns.

**b) Server-side validation function** `validate_filing_config_period()` as a BEFORE INSERT/UPDATE trigger:
- `date_from` is required
- `date_to` must be >= `date_from` if not null
- No overlapping date ranges (only one open-ended record allowed)
- Raises exception on violation

**c) RPC `get_filing_config_for_date(p_date DATE)`**: Returns the active filing config whose `date_from <= p_date` and (`date_to >= p_date` OR `date_to IS NULL`). Falls back to the open-ended record if no exact match.

**d) RPC `upsert_filing_config_period(...)`**: Creates or updates a filing config period with full server-side validation (overlap check, date validation). Returns the saved record or error.

**e) Data migration**: Copy current `c3_calculation_config` filing values into the new table as the initial period record.

**f) Policies**: Authenticated users can read; admins can manage.

### 2. Frontend: Rebuild `C3FilingConfigTab.tsx`

Replace the current flat config card with a date-range-aware UI:
- **Period list**: Table showing all filing config periods with `date_from`, `date_to`, status badge (Active/Historical/Open-ended), and all 5 parameter values
- **Add Period button**: Opens a dialog/form to create a new period with date pickers for `date_from`/`date_to` and inputs for all 5 parameters
- **Edit**: Inline or dialog edit for each period
- **Validation messages**: Display server-returned overlap/date errors using toast

### 3. Frontend: New Hook `useFilingConfigPeriods.ts`

- `useFilingConfigPeriods()`: Fetches all periods ordered by `date_from DESC`
- `useUpsertFilingConfigPeriod()`: Mutation calling the upsert RPC
- `useDeleteFilingConfigPeriod()`: Soft-delete (set `is_active = false`)

### 4. Backend RPCs Integration

The existing `calculate_c3_contributions` RPC already reads filing config from `c3_config_details`. The new `get_filing_config_for_date` RPC provides standalone date-based lookup for any module that needs it. The old `c3_calculation_config` filing rows remain for backward compatibility but the UI will manage the new table going forward.

### 5. No Changes to Other Categories

Social Security, Levy, Severance, Penalty categories continue using the existing `c3_calculation_config` flat key-value approach unchanged.

## Files Modified/Created

1. **New migration**: Table creation, validation trigger, RPCs, data migration, policies
2. **New file**: `src/hooks/useFilingConfigPeriods.ts`
3. **Rewrite**: `src/components/admin/c3-configuration/C3FilingConfigTab.tsx` — period-based management UI
4. **Minor update**: `src/types/c3CalculationConfig.ts` — add `FilingConfigPeriod` interface

## SQL for Live Environment

```sql
-- 1. Create table
CREATE TABLE public.c3_filing_config_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_from DATE NOT NULL,
  date_to DATE,
  week_start_day INTEGER NOT NULL DEFAULT 1,
  filing_window_unit INTEGER NOT NULL DEFAULT 1,
  filing_window_value INTEGER NOT NULL DEFAULT 1,
  penalty_initial_threshold INTEGER NOT NULL DEFAULT 1,
  penalty_subsequent_threshold INTEGER NOT NULL DEFAULT 12,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Validation trigger (overlap + date checks)
-- 3. get_filing_config_for_date RPC
-- 4. upsert_filing_config_period RPC
-- 5. Migrate existing data from c3_calculation_config filing rows
-- 6. Indexes and policies
```

## Edge Cases Handled
- Overlapping date ranges blocked server-side with clear error message
- Only one open-ended (NULL `date_to`) record allowed
- `date_to < date_from` blocked by trigger
- Creating period for past dates allowed (historical correction)
- All validation happens in PostgreSQL, not client-side

