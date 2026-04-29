## Goal

Relax the C3 configuration deletion rule so that a period whose `start_date` is the **current month** is also deletable. Only periods that are **strictly in the past** (i.e., already filed/submitted in a prior month) should remain frozen.

### Why
A C3 for a given period (e.g., March salary) is only filed/submitted in the **following month** (April). So during the current month, the configuration has not yet been consumed by any C3 generation and is still safe to remove or replace. Past periods, however, have already been used and must stay frozen for audit integrity.

## Changes

### 1. Database — relax the date check in both RPCs

File: new migration

In `public.c3_config_period_deletability(uuid)` and `public.delete_c3_config_period(uuid, varchar)`:

Change the frozen-period guard from:

```sql
IF v_period.start_date <= v_current_month_start THEN
  -- "Period is current or past — already in use for C3 generation"
```

to:

```sql
IF v_period.start_date < v_current_month_start THEN
  -- "Period is in the past — already used in C3 generation and frozen"
```

Effect:
- `start_date` = current month → **deletable** (unless published or has submissions)
- `start_date` < current month (any prior month) → frozen
- `start_date` > current month (future) → deletable (unchanged)

The other guards remain in force and still protect data integrity:
- `last_published_at IS NOT NULL` → blocked
- Any matching row in `c3_submissions` whose `filing_period` falls inside the period's date range → blocked
- Cannot delete the last remaining active period → blocked

So even if the current month is "open" by date, an actual C3 submission or a publish for that period will still freeze it.

### 2. UI tooltip copy

File: `src/components/admin/c3-configuration/C3PeriodConfigTab.tsx`

The disabled-state tooltip already comes from the RPC's `reason` field, so updating the RPC message is enough. No structural UI change is needed beyond verifying the new wording reads correctly.

### 3. No client-side logic change required

`useC3PeriodsDeletability` already calls the RPC and reflects whatever it returns, so the new behaviour propagates automatically once the migration is applied.

## Out of scope

- The Publish-badge / sync-status logic (already handled in the previous change).
- Splitting / cloning behaviour.
- Auditing — the existing `c3_config_audit` snapshot on delete remains unchanged.

## Risk & verification

- Risk is low: we only **widen** what is deletable for one month boundary, and the submission-count and publish guards still protect any current-month period that has actually been used.
- After deploy, verify:
  1. A future-month period is deletable (existing behaviour).
  2. A current-month period with no submissions and not published becomes deletable (new behaviour).
  3. A current-month period that has any `c3_submissions` row in its range stays blocked with the submissions reason.
  4. Any period strictly before the current month stays blocked with the new "in the past" reason.
