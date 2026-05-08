## Issue
Publishing to C3-Wizard (v4.1) fails with:
```
[wizard_error] Filing config upsert failed: permission denied for table wiz_c3_filing_config_periods
```
This error originates on the **C3-Wizard side** — the SSB Admin edge function (`c3-config-sync-publish`) successfully built and sent the payload (1 filing config period included), and the Wizard endpoint returned HTTP 500 with the Postgres permission error.

## Root Cause (C3-Wizard side)
The newly created `wiz_c3_filing_config_periods` table (added in v4.1 per spec §2.2) was not granted to the role that the Wizard's API uses to perform inserts/updates. All other `wiz_c3_*` tables already have the correct grants — only this new table is missing them.

## Action
This is **not** fixable from SSB Admin. We need to send a request to the C3-Wizard team to grant the missing table privileges.

Create a new request document:
`docs/C3_WIZARD_REQUEST_FILING_CONFIG_PERMISSION_FIX.md`

Contents:
- Summary of the failing publish call (timestamp, payload counts from the edge log)
- Exact error message
- Root cause (missing GRANT on `wiz_c3_filing_config_periods` for the Wizard API role / RLS policy)
- Required fix on Wizard DB — provide ready-to-run SQL the Wizard team can apply, e.g.:
  ```sql
  GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.wiz_c3_filing_config_periods
    TO <wizard_api_role>;
  -- If RLS is enabled, add INSERT/UPDATE policies matching the
  -- pattern used by wiz_c3_config_periods.
  ```
- Verification steps (re-run Publish from SSB Admin → expect HTTP 200 with `filing_config_periods: 1`)
- Reference back to the v4.1 schema confirmation message already received
- Mark severity: Blocker (Publish flow fully broken)

No code or DB changes on the SSB Admin side are required.

## Files
- New: `docs/C3_WIZARD_REQUEST_FILING_CONFIG_PERMISSION_FIX.md`

## Verification
After Wizard team applies the grant:
1. Click **Publish to C3-Wizard** on `/admin/c3-configuration`.
2. Expect success toast and `filing_config_periods: 1` in the response summary.
3. Badge flips to **Synced {date}**.
