# C3 Wizard — Sync Endpoint Update Required

**Date:** 2026-03-15  
**From:** SSB Admin Team  
**To:** C3 Wizard Development Team  
**Priority:** HIGH  
**Subject:** Sync endpoint must handle 6 new payload arrays (Sync Protocol v4.0)

---

## Issue Summary

The SSB Admin system has been updated to **Sync Protocol v4.0**, which now publishes **12 configuration table groups** (up from 6). The SSB Admin publish functionality is working correctly — payloads are being sent with all 12 arrays populated with data.

However, the C3 Wizard sync endpoint is **only processing the original 6 arrays** and **ignoring the 6 new arrays**, resulting in **0 rows** in the corresponding C3 Wizard tables.

### Evidence from Sync Logs

The latest publish (ID: `b322af2c`) shows:

| Array | SSB Admin (Sent) | C3 Wizard (Received) |
|-------|-----------------|---------------------|
| `config_periods` | 1 ✅ | 1 ✅ |
| `levy_slabs` | 2 ✅ | 2 ✅ |
| `bonus_policies` | 1 ✅ | 1 ✅ |
| `bonus_exceptions` | 1 ✅ | 1 ✅ |
| `holiday_policies` | 2 ✅ | 2 ✅ |
| `holiday_exceptions` | 0 ✅ | 0 ✅ |
| **`calculation_configs`** | **36** | **0 ❌** |
| **`income_codes`** | **1** | **0 ❌** |
| **`income_categories`** | **14** | **0 ❌** |
| **`self_emp_contrib_rates`** | **19** | **0 ❌** |
| **`income_code_policies`** | **1** | **0 ❌** |
| **`income_code_exceptions`** | **0** | **0 (N/A)** |

---

## Required Changes on C3 Wizard Side

### 1. Create 6 New Mirror Tables

The following tables must be created in the C3 Wizard database:

#### a) `wiz_calculation_config`
Mirrors `c3_calculation_config` from SSB Admin.

```sql
CREATE TABLE IF NOT EXISTS public.wiz_calculation_config (
  id UUID PRIMARY KEY,
  config_key TEXT NOT NULL,
  config_value NUMERIC NOT NULL,
  config_type TEXT NOT NULL,        -- 'rate', 'amount', 'age', 'days', 'weeks', 'months'
  category TEXT NOT NULL,           -- 'social_security', 'levy', 'severance', 'penalty', 'voluntary_contributor', 'filing'
  display_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ DEFAULT now()
);
```

**Key config_keys used in calculations:**
- `week_start_day` — Day of week (1=Monday..7=Sunday)
- `filing_window_value` / `filing_window_unit` — Filing deadline calculation
- `initial_penalty_threshold` / `initial_penalty_periods` — Tiered penalty logic
- `subsequent_penalty_period` — Subsequent penalty period
- `late_fine_amount` / `late_fine_cap` — Late filing fines
- All Social Security rates, Levy thresholds, Severance rates

#### b) `wiz_income_codes`
Mirrors `tb_income_codes` from SSB Admin.

```sql
CREATE TABLE IF NOT EXISTS public.wiz_income_codes (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ DEFAULT now()
);
```

#### c) `wiz_income_cat`
Mirrors `tb_income_cat` from SSB Admin. Used for Self-Employed wage categories.

```sql
CREATE TABLE IF NOT EXISTS public.wiz_income_cat (
  category_code TEXT PRIMARY KEY,
  wage_upper NUMERIC,
  appeal TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
```

#### d) `wiz_self_emp_contrib_rate`
Mirrors `tb_self_emp_contrib_rate` from SSB Admin. Used for Self-Employed contribution calculations.

```sql
CREATE TABLE IF NOT EXISTS public.wiz_self_emp_contrib_rate (
  effstart DATE NOT NULL,
  effend DATE,
  wage_cat TEXT NOT NULL,
  sep_ss_percent NUMERIC NOT NULL,
  sep_penalty_percent NUMERIC NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (effstart, wage_cat)
);
```

#### e) `wiz_income_code_policy_default`
Mirrors `c3_income_code_policy_default` from SSB Admin.

```sql
CREATE TABLE IF NOT EXISTS public.wiz_income_code_policy_default (
  id UUID PRIMARY KEY,
  income_code TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE,
  date_entry_mode TEXT NOT NULL DEFAULT 'no_dates',
  calculation_method TEXT NOT NULL DEFAULT 'flat',
  calc_flat_percentage NUMERIC,
  calc_flat_enabled BOOLEAN DEFAULT true,
  calc_slab_enabled BOOLEAN DEFAULT false,
  distribution JSONB DEFAULT '{}',
  contrib_employee BOOLEAN DEFAULT true,
  contrib_employer BOOLEAN DEFAULT true,
  contrib_eir BOOLEAN DEFAULT true,
  contrib_severance BOOLEAN DEFAULT true,
  include_in_levy BOOLEAN DEFAULT true,
  include_in_severance BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ DEFAULT now()
);
```

#### f) `wiz_income_code_policy_exceptions`
Mirrors `c3_income_code_policy_exceptions` from SSB Admin.

```sql
CREATE TABLE IF NOT EXISTS public.wiz_income_code_policy_exceptions (
  id UUID PRIMARY KEY,
  income_code TEXT NOT NULL,
  employer_ref TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE,
  date_entry_mode TEXT,
  calculation_method TEXT,
  calc_flat_percentage NUMERIC,
  calc_flat_enabled BOOLEAN,
  calc_slab_enabled BOOLEAN,
  distribution JSONB,
  contrib_employee BOOLEAN,
  contrib_employer BOOLEAN,
  contrib_eir BOOLEAN,
  contrib_severance BOOLEAN,
  include_in_levy BOOLEAN,
  include_in_severance BOOLEAN,
  is_active BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 2. Update the Sync Endpoint Logic

The sync endpoint handler must be updated to process the 6 new arrays from the payload. The sync strategy for each:

| Array in Payload | Target Table | Sync Strategy |
|-----------------|-------------|---------------|
| `calculation_configs[]` | `wiz_calculation_config` | **Full Replace** — DELETE all, then INSERT |
| `income_codes[]` | `wiz_income_codes` | **UPSERT** on `id` |
| `income_categories[]` | `wiz_income_cat` | **Full Replace** — DELETE all, then INSERT |
| `self_emp_contrib_rates[]` | `wiz_self_emp_contrib_rate` | **Full Replace** — DELETE all, then INSERT |
| `income_code_policies[]` | `wiz_income_code_policy_default` | **UPSERT** on `id` |
| `income_code_exceptions[]` | `wiz_income_code_policy_exceptions` | **UPSERT** on `id` |

#### Example Processing (Pseudocode):
```typescript
// Inside the sync endpoint handler, after processing existing 6 arrays:

// 7. Calculation Configs (Full Replace)
if (payload.calculation_configs?.length > 0) {
  await supabase.from('wiz_calculation_config').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('wiz_calculation_config').insert(
    payload.calculation_configs.map(c => ({
      ...c,
      synced_at: new Date().toISOString()
    }))
  );
}

// 8. Income Codes (Upsert)
if (payload.income_codes?.length > 0) {
  await supabase.from('wiz_income_codes').upsert(
    payload.income_codes.map(c => ({ ...c, synced_at: new Date().toISOString() })),
    { onConflict: 'id' }
  );
}

// 9. Income Categories (Full Replace)
if (payload.income_categories?.length > 0) {
  await supabase.from('wiz_income_cat').delete().neq('category_code', '');
  await supabase.from('wiz_income_cat').insert(
    payload.income_categories.map(c => ({
      ...c,
      synced_at: new Date().toISOString()
    }))
  );
}

// 10. Self-Employed Contribution Rates (Full Replace)
if (payload.self_emp_contrib_rates?.length > 0) {
  await supabase.from('wiz_self_emp_contrib_rate').delete().neq('wage_cat', '');
  await supabase.from('wiz_self_emp_contrib_rate').insert(
    payload.self_emp_contrib_rates.map(r => ({
      ...r,
      synced_at: new Date().toISOString()
    }))
  );
}

// 11. Income Code Policies (Upsert)
if (payload.income_code_policies?.length > 0) {
  await supabase.from('wiz_income_code_policy_default').upsert(
    payload.income_code_policies.map(p => ({ ...p, synced_at: new Date().toISOString() })),
    { onConflict: 'id' }
  );
}

// 12. Income Code Exceptions (Upsert)
if (payload.income_code_exceptions?.length > 0) {
  await supabase.from('wiz_income_code_policy_exceptions').upsert(
    payload.income_code_exceptions.map(e => ({ ...e, synced_at: new Date().toISOString() })),
    { onConflict: 'id' }
  );
}
```

---

### 3. Update the Sync Log Recording

The `wiz_config_sync_log` table must record counts for the new arrays. Update the sync log INSERT to include:

```sql
ALTER TABLE public.wiz_config_sync_log
  ADD COLUMN IF NOT EXISTS calculation_config_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_codes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_categories_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS se_contrib_rates_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_code_policies_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_code_exceptions_count INTEGER DEFAULT 0;
```

When recording the sync log, populate these counts:
```typescript
calculation_config_count: payload.calculation_configs?.length || 0,
income_codes_count: payload.income_codes?.length || 0,
income_categories_count: payload.income_categories?.length || 0,
se_contrib_rates_count: payload.self_emp_contrib_rates?.length || 0,
income_code_policies_count: payload.income_code_policies?.length || 0,
income_code_exceptions_count: payload.income_code_exceptions?.length || 0,
```

---

### 4. Database Permissions

Ensure the sync endpoint's database role has:

```sql
GRANT INSERT, UPDATE, DELETE ON public.wiz_calculation_config TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wiz_income_codes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wiz_income_cat TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wiz_self_emp_contrib_rate TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wiz_income_code_policy_default TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wiz_income_code_policy_exceptions TO authenticated;
```

---

## Payload Structure Reference (v4.0)

```json
{
  "sync_version": "4.0",
  "sync_timestamp": "2026-03-15T12:00:00.000Z",
  "config_periods": [...],
  "levy_slabs": [...],
  "bonus_policies": [...],
  "bonus_exceptions": [...],
  "holiday_policies": [...],
  "holiday_exceptions": [...],
  "calculation_configs": [...],        // NEW — 36 rows
  "income_codes": [...],              // NEW — 1 row
  "income_categories": [...],         // NEW — 14 rows
  "self_emp_contrib_rates": [...],    // NEW — 19 rows
  "income_code_policies": [...],      // NEW — 1 row
  "income_code_exceptions": [...]     // NEW — 0 rows currently
}
```

---

## Verification Steps

After implementing the changes:

1. Trigger a publish from SSB Admin (C3 Configuration → Publish to C3-Wizard)
2. Check the `wiz_config_sync_log` — all count columns should be non-zero
3. Verify data in mirror tables:
   - `SELECT count(*) FROM wiz_calculation_config;` — should be **36**
   - `SELECT count(*) FROM wiz_income_codes;` — should be **1**
   - `SELECT count(*) FROM wiz_income_cat;` — should be **14**
   - `SELECT count(*) FROM wiz_self_emp_contrib_rate;` — should be **19**
   - `SELECT count(*) FROM wiz_income_code_policy_default;` — should be **1**
4. Confirm the Sync History tab in SSB Admin shows non-zero counts

---

## Contact

For questions about the payload structure or data format, contact the SSB Admin team.
