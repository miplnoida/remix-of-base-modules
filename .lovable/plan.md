## Findings

**1. Why "Changes Pending Sync" appears even though nothing visibly changed**

The sync detector in `useC3SyncStatus` (src/hooks/useC3ConfigPublish.ts) flags pending whenever `modified_on > last_published_at` — it does NOT compare actual values.

DB check confirms:

- Last successful publish: `2026-03-20 12:42:40`
- Period `2025-01-01 → 2026-03-31` has `modified_on = 2026-04-29 12:37:46` (touched today, likely by toggle/delete-attempt triggers updating `modified_on` even when the row content was unchanged)
- All other tables (slabs, bonus, holiday, IC, calc, SE rates) show 0 pending

So the badge is correct from the system's point of view — the row's `modified_on` was bumped after the last publish — but misleading from the user's point of view because the values are identical.

**2. End Date display**

The screenshot shows `31-03-2026`. That's the actual `end_date` stored in the DB for that period. The user wants it to instead display today's date when this period is the "current" (latest active) one.

## Plan

### A. Make "Pending Sync" reflect actual content changes, not just timestamps

Update `useC3SyncStatus` in `src/hooks/useC3ConfigPublish.ts` to compare a payload hash against the last successful sync's `payload_hash`, instead of trusting `modified_on`.

Steps:

1. Build the same payload that `publishToC3Wizard` builds (reuse `buildSyncPayload`).
2. Compute a stable SHA-256 hash of the canonical JSON (sorted keys).
3. Read the last successful `c3_config_sync_log.payload_hash`.
4. `hasPendingChanges = currentHash !== lastHash` (true when no prior publish exists and there is data).
5. Keep the per-table `pendingCounts` only for the dialog summary — derive them from rows whose hash slice differs, or simply show "—" / total active rows when no diff is per-row available. Simplest: keep current count logic but only display when `hasPendingChanges` is true.

Result: After today's accidental "touch" that didn't change values, the hash will match the last published hash → badge will correctly read "Synced …" instead of "Changes Pending Sync".

### B. Show today's date as the End Date for the current open/latest period

In `src/components/admin/c3-configuration/C3PeriodConfigTab.tsx`:

- Identify the "current" period as the latest-by-`start_date` row whose `is_active` is true.
- For that row only, render today's date (formatted via `formatDisplayDate(new Date().toISOString())`) in the End Date column with a small "Current" badge next to it.
- All other rows continue to show their stored `end_date`.
- Do NOT modify the stored `end_date` in the database — this is purely a display-layer change so the sync hash stays stable and history remains intact.

### Technical details

Files to edit:

- `src/hooks/useC3ConfigPublish.ts` — replace timestamp-based diff with payload-hash diff; reuse `buildSyncPayload` + add a `canonicalJsonHash` helper using `crypto.subtle.digest('SHA-256', …)`.
- `src/components/admin/c3-configuration/C3PeriodConfigTab.tsx` — render today's date for the latest active period in the End Date cell.

No DB migration required.

### Out of scope

- Persisting today's date as the actual `end_date` (would itself bump `modified_on` and trigger the very issue we're fixing, plus would corrupt the period boundary used by C3 generation).
- Changing how `modified_on` triggers fire on the period table.  
  
  
No actually it shows the current text in the end date as it was wokring before.