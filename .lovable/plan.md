## Goal

Two related fixes on the C3 Period Configuration screen:

1. **Delete unused C3 configuration periods** — only when the period has not yet been "used" for C3 generation. Past/used periods must be frozen.
2. **Publish badge must light up when a brand-new period is added**, not only when an existing period's details are edited.

---

## Part A — Delete C3 Configuration

### Eligibility rule (what counts as "deletable" / "future-only")

A period in `c3_config_periods` is **deletable** when ALL of the following are true:

1. The period has **never been published** to C3-Wizard — `last_published_at IS NULL`.
2. The period's effective window has **not started being used for C3 generation**. Because employer C3s for month *M* are processed in month *M+1*, a period is considered "in-use" the moment its `start_date <= first_day_of_current_month`. So deletion is allowed only when `start_date > first_day_of_current_month` (i.e. the period starts in a future month).
3. No row exists in `c3_submissions` whose `filing_period` (YYYY-MM text) falls within `[start_date, end_date]` of the period (defensive check — catches any backfilled or manually loaded usage).
4. The period is not the **only remaining active period** (we always keep at least one active config so calculations don't break).

If any of (1)–(3) is false → the period is **frozen** and the Delete action is hidden / disabled with a tooltip explaining why.

### UI changes

`src/components/admin/c3-configuration/C3PeriodConfigTab.tsx` (and the legacy `src/pages/admin/C3PeriodConfigPage.tsx` mirror):

- Add a **Delete** icon button (Trash2) in the Actions column next to View/Clone.
- Show it only when the row's `canDelete` flag is true (computed by the hook below). When not deletable, render the icon disabled with a tooltip:
  - "Already published — cannot be deleted" (rule 1 fails)
  - "Period is current or past — already in use for C3 generation" (rule 2 fails)
  - "Period has C3 submissions and cannot be deleted" (rule 3 fails)
  - "At least one active period must remain" (rule 4 fails)
- Clicking Delete opens an `AlertDialog` confirmation: "Delete configuration period {start} – {end}? This will also delete its calculation details. This action cannot be undone." with Cancel / Delete buttons. Delete is destructive variant.

### Hook

`src/hooks/useC3ConfigManagement.ts` — add:

- `useDeleteC3ConfigPeriod()` mutation that calls a new RPC `delete_c3_config_period(p_period_id uuid, p_user_code varchar)`.
- After success: invalidate `['c3-config-periods']`, `['c3-sync-status']`, `['c3-unified-audit-logs']`, and toast success.
- On RPC-returned `{ error: '...' }`, throw to surface as an error toast.

### RPC (new migration)

```sql
create or replace function public.delete_c3_config_period(
  p_period_id uuid,
  p_user_code varchar
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period record;
  v_current_month_start date := date_trunc('month', current_date)::date;
  v_submission_count int;
  v_active_count int;
  v_old jsonb;
begin
  select * into v_period from c3_config_periods where id = p_period_id;
  if not found then
    return jsonb_build_object('error', 'Period not found');
  end if;

  -- Rule 1: never published
  if v_period.last_published_at is not null then
    return jsonb_build_object('error', 'Period has been published to C3-Wizard and cannot be deleted');
  end if;

  -- Rule 2: future-only (start strictly after current month start)
  if v_period.start_date <= v_current_month_start then
    return jsonb_build_object('error', 'Period is current or past and is already in use for C3 generation');
  end if;

  -- Rule 3: no submissions within window
  select count(*) into v_submission_count
    from c3_submissions
   where to_date(filing_period || '-01', 'YYYY-MM-DD') between v_period.start_date
         and coalesce(v_period.end_date, date '9999-12-31');
  if v_submission_count > 0 then
    return jsonb_build_object('error', 'Period has C3 submissions and cannot be deleted');
  end if;

  -- Rule 4: keep at least one active period
  select count(*) into v_active_count from c3_config_periods where is_active = true;
  if v_period.is_active and v_active_count <= 1 then
    return jsonb_build_object('error', 'At least one active configuration period must remain');
  end if;

  -- Snapshot for audit
  v_old := jsonb_build_object(
    'period', row_to_json(v_period),
    'details', (select row_to_json(d) from c3_config_details d where d.config_period_id = p_period_id)
  );

  delete from c3_config_details where config_period_id = p_period_id;
  delete from c3_config_periods where id = p_period_id;

  insert into system_audit_trail (table_name, record_id, action, old_values, new_values, user_code, performed_at)
  values ('c3_config_periods', p_period_id::text, 'DELETE', v_old, null, p_user_code, now());

  return jsonb_build_object('success', true);
end $$;
```

A second helper RPC `c3_config_period_deletability(p_period_id uuid)` returns `{ can_delete bool, reason text }` so the UI can render the disabled tooltip without duplicating the logic in TS. The list query is enriched to call this in a single batched select (or computed client-side mirroring the same rules — chosen client-side for performance, with the RPC as the authoritative gate at delete-time).

The hook computes `canDelete` client-side from the already-fetched fields (`last_published_at`, `start_date`, active count) plus a single `c3_submissions` count query keyed by all period IDs, to avoid N+1.

### Audit / sync side-effects

- Deletion logs to `system_audit_trail` and to `c3_unified_audit_log` via `logC3ConfigChange({ action: 'DELETE', configType: 'period_config', ... })` from the hook.
- Because the period was never published, no Wizard sync rollback is needed.

---

## Part B — Publish badge: light up for newly-added periods

### Current behaviour

`useC3SyncStatus` in `src/hooks/useC3ConfigPublish.ts` already counts:

- `pMod` = `c3_config_periods.modified_on > lastPublishedAt`
- `pNew` = `c3_config_periods.last_published_at IS NULL`

…and adds them as `periods = pMod + pNew`. In principle a brand-new row should bubble up via `pNew`. In practice the badge does not light up for newly-created periods because:

1. `create_c3_config_period` and `clone_c3_config` insert the new row but on some paths set/copy `last_published_at` from the source row, so `pNew` does not catch it.
2. The "split" path in `C3ConfigDetailsDialog.handleConfirmSplit` writes both the new period and its details, but does not invalidate `['c3-sync-status']`, so the badge waits up to 30 s for the next refetch.
3. `c3_config_details` changes are not counted at all — editing only the details table (no period row touched) is invisible to the status query.

### Fixes

1. **DB hygiene** — in a migration, ensure `clone_c3_config` and `create_c3_config_period` always set `last_published_at = NULL` on the inserted row (and never copy it from the source). Add a `BEFORE INSERT` trigger on `c3_config_periods` that forces `last_published_at := NULL` on insert as a safety net.
2. **Count detail edits as pending** — extend `useC3SyncStatus` to also query:
  ```ts
   supabase.from('c3_config_details').select('*', { count: 'exact', head: true }).gt('modified_on', lastPublishedAt)
  ```
   and add the result into the `periods` bucket (so the existing "X period configuration(s)" line in the publish dialog reflects detail edits too). On first-time (`!lastPublishedAt`) branch, also count `c3_config_details` rows.
3. **Cache invalidation on every write path** — in `C3ConfigDetailsDialog.tsx`, `useCreateC3ConfigPeriod`, `useCloneC3Config`, `useUpdateC3ConfigDetails`, `useUpsertC3ConfigWithSplit`, and the new `useDeleteC3ConfigPeriod`, add `queryClient.invalidateQueries({ queryKey: ['c3-sync-status'] })` so the badge updates immediately instead of waiting 30 s.
4. **Verify the "split" path** in `C3ConfigDetailsDialog.handleConfirmSplit` invalidates `c3-sync-status` after both the period insert and the details insert.

### Acceptance for Part B

- Add a new period via "New Period" → badge flips to "Changes Pending Sync" within ~1 s.
- Clone a period → same.
- Split a period (edit a value with split confirm) → same.
- Edit only `c3_config_details` of an existing published period → badge lights up.
- Click Publish, sync succeeds → badge returns to "Synced {date}".

---

## Files to edit / create

**New migration**

- `supabase/migrations/<ts>_c3_config_period_delete_and_sync.sql`
  - `delete_c3_config_period(uuid, varchar)` RPC
  - `c3_config_period_deletability(uuid)` RPC (optional helper)
  - Update `clone_c3_config` and `create_c3_config_period` to force `last_published_at = NULL`
  - `BEFORE INSERT` trigger on `c3_config_periods` setting `last_published_at = NULL`

**Hooks**

- `src/hooks/useC3ConfigManagement.ts` — add `useDeleteC3ConfigPeriod`; add `usePeriodSubmissionCounts` (batched) and expose `canDelete` per row via a derived selector.
- `src/hooks/useC3ConfigPublish.ts` — include `c3_config_details` in pending counts; small refactor only.

**Components**

- `src/components/admin/c3-configuration/C3PeriodConfigTab.tsx` — add Delete button, tooltip, confirm dialog.
- `src/pages/admin/C3PeriodConfigPage.tsx` — mirror the same Delete UX (legacy page still in routes).
- `src/components/admin/c3-period-config/C3ConfigDetailsDialog.tsx` — invalidate `c3-sync-status` after split/save.

**No edits** to `src/integrations/supabase/types.ts` (auto-generated) or `src/integrations/supabase/client.ts`.

## Out of scope

- No auto-merge of equivalent adjacent periods (previously declined).
- No changes to the published Wizard payload schema.
- No bulk delete.  
  
  
Important Note;- Ensure the existing functionality should not be impacted.