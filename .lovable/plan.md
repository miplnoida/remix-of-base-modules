

# Fix: Publish to Live Failure — Missing `ce_reconcile_result` Type

## Root Cause

The publish-to-Live pipeline fails because several compliance module database objects were created **manually in Test** but never captured in a migration file. When migrations run sequentially on Live, they reference objects that don't exist:

1. **3 enum types** — `ce_ledger_status`, `ce_ledger_entry_type`, `ce_fund_type`
2. **2 tables** — `ce_employer_financial_ledger`, `ce_penalty_calculations`

The first migration to fail is `20260411114541` (Phase 1 Hardening) which adds FK constraints and indexes referencing `ce_employer_financial_ledger`. Subsequent migrations that reference `ce_reconcile_result` also fail in cascade.

## Fix

Create **one new migration** with a timestamp **before** `20260411114541` (e.g., `20260411114500`) that bootstraps all missing objects using `IF NOT EXISTS` / `DO $$ ... $$` patterns so it's safe to run in both Test (where they already exist) and Live (where they don't).

### Migration contents:
```sql
-- 1. Create enum types (idempotent via DO blocks)
DO $$ BEGIN CREATE TYPE ce_ledger_status AS ENUM ('POSTED','REVERSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ce_fund_type AS ENUM ('SS','LEVY','EI'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ce_ledger_entry_type AS ENUM ('C3_DUES_POSTED','PAYMENT_RECEIVED','PENALTY_ASSESSED','INTEREST_ACCRUED','WAIVER_APPLIED','ADJUSTMENT','REVERSAL','WRITE_OFF','ARRANGEMENT_CREDIT','REFUND'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Create ce_employer_financial_ledger table (all 22 columns)
CREATE TABLE IF NOT EXISTS ce_employer_financial_ledger ( ... );

-- 3. Create ce_penalty_calculations table (all 17 columns)
CREATE TABLE IF NOT EXISTS ce_penalty_calculations ( ... );

-- 4. Create essential indexes
CREATE INDEX IF NOT EXISTS ... ;
```

All column definitions, defaults, and types will match the current Test schema exactly.

### File

| File | Change |
|------|--------|
| `supabase/migrations/20260411114500_bootstrap_ce_financial_objects.sql` | New migration: create 3 types + 2 tables that were missing from migration chain |

### What stays unchanged
- All existing migration files — untouched
- All frontend code — unaffected
- All edge functions — unaffected

### After this fix
Re-publishing should succeed because Live will now have the prerequisite objects before the dependent migrations run.

