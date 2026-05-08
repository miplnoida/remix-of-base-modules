## Root cause found

The publish request is failing before it reaches the `c3-config-sync-publish` backend function. The current client insert into `c3_config_sync_log` includes:

- `filing_config_periods_count`

But that column is missing in both dev and live database schemas. The migration file exists in the repo, but it has not been applied to the active backend. Because the log insert fails first, no backend function logs or Wizard request are created, and the UI only shows `Publishing failed`.

## Fix plan

1. Apply a database migration to align the active backend schema with the current publish code:
   - Add `c3_config_sync_log.filing_config_periods_count` with default `0`
   - Add `c3_filing_config_periods.last_published_at` so the post-publish sync marker update also works

2. Keep the existing publish flow unchanged:
   - Build payload in `useC3ConfigPublish.ts`
   - Insert a pending sync log row
   - Invoke `c3-config-sync-publish`
   - Update the sync log to success or failed
   - Mark active config rows as published

3. Verify after migration:
   - Confirm the new column exists in the backend schema
   - Re-check latest sync log rows
   - Ask you to click **Publish** again; if the request reaches C3-Wizard and fails there, the toast should now show the real Wizard-side error such as `[wizard_error] ...` instead of the generic local failure

## Files / database touched

- Database only: `public.c3_config_sync_log`, `public.c3_filing_config_periods`
- No UI logic change is required for this specific root cause.