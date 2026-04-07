

## Fix: `designations_pkey already exists` Migration Failure

### Root Cause

Migration `20260402195103_46eb88bc-...sql` contains an **unconditional** rename:
```sql
ALTER TABLE designations RENAME TO tb_designations;
```

In Live, the `designations` table (with its `designations_pkey` constraint) already exists from the initial pg_dump migration. When this unconditional migration runs against Live, it conflicts because the constraint relationship is already established, causing the cascade failure.

A later migration (`20260404165150`) already handles this **idempotently** with proper `IF EXISTS` checks. The unconditional one is redundant and breaking deployment.

### Fix

**Replace the contents of `supabase/migrations/20260402195103_46eb88bc-f083-4bea-a012-eeba041dc979.sql`** with an empty/no-op statement:

```sql
-- Superseded by idempotent migration 20260404165150
SELECT 1;
```

This neutralizes the unconditional rename while preserving the migration entry in the history. The idempotent version in `20260404165150` will handle the rename safely.

### Files

| File | Change |
|------|--------|
| `supabase/migrations/20260402195103_46eb88bc-f083-4bea-a012-eeba041dc979.sql` | Replace unconditional `ALTER TABLE` with no-op `SELECT 1` |

