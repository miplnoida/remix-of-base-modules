## Problem

When publishing C3 Configuration to C3-Wizard, the Wizard rejects the request with:

```
[wizard_error] Period upsert failed: value too long for type character varying(5)
```

This is a **schema mismatch on the C3-Wizard side**: one of the columns the Wizard upserts into its `config_periods` (or related "Period") table is declared as `VARCHAR(5)`, and our payload contains a value longer than 5 characters for that column.

## What we know

From the source DB:
- `c3_config_periods.modified_by = "SAdmin"` (6 chars). Our edge-function client truncates `created_by` / `modified_by` / `updated_by` to 5 chars before sending, so this should arrive as `"SAdmi"` (length 5) — within the limit.
- `c3_config_periods.description = "Default configuration effective from January 2025"` (50+ chars). Locally `description` is `text`. **If Wizard declared `description` as `VARCHAR(5)`, this would be the culprit.**
- `c3_filing_config_periods.created_by = "SYSTEM"` (6 chars). This is *not* in the truncation list (`AUDIT_FIELDS` only covers `created_by/modified_by/updated_by` — `SYSTEM` is 6 chars and gets truncated to `SYSTE`, fine).
- The nested `details` object also has its audit fields truncated.

So the most likely offenders are **non-audit string fields** on `config_periods` that the Wizard happens to model as `VARCHAR(5)` — most likely `description`, but it could also be a new field we are unaware of.

## Plan

### 1. Add diagnostic logging in the edge function (one publish round-trip)

Update `supabase/functions/c3-config-sync-publish/index.ts` so that, before forwarding, it logs:

- For every row in `payload.config_periods` and `payload.filing_config_periods`, the **field name → string length** map for any string field whose value length is `> 5`.

Example log line:
```
[period-diag] config_periods[0] over-5 fields: { description: 50, modified_by: 5 }
```

This lets us confirm exactly which column triggers `varchar(5)` on the Wizard side without guessing. Logging only — no behaviour change.

### 2. Apply the targeted fix

Once the diagnostic identifies the offending column(s), update `buildSyncPayload()` in `src/hooks/useC3ConfigPublish.ts`:

- Add the column(s) to a new `WIZARD_VARCHAR5_FIELDS` list and truncate to 5 chars on the outgoing mirror copy (same pattern as the existing `AUDIT_FIELDS` truncation — local DB values stay untouched).
- If the offender is `description` (likely), truncating to 5 chars would destroy meaning. In that case the correct fix is to **omit** the field from the outgoing payload for the affected table instead of truncating, and document this in `docs/C3_WIZARD_SYNC_ENDPOINT_UPDATE_REQUIRED.md` so the Wizard team can widen the column.

### 3. Re-publish and confirm

- Trigger "Publish to C3-Wizard" from the admin UI.
- Verify the edge-function logs show `Sync Publish - Success` and the toast reports success counts.
- Confirm `c3_config_sync_log.status = 'success'` for the latest entry.

### 4. Memory & docs

- Add a short note to `docs/C3_WIZARD_SYNC_ENDPOINT_UPDATE_REQUIRED.md` describing which Wizard column is `VARCHAR(5)` and what we mirror-truncate / omit.
- No DB migration on our side — the Wizard schema is not under our control and our local schemas are already wider.

## Out of scope

- Changing Wizard-side schema (cannot do from this project).
- Adding new payload tables.
- Any UI changes beyond the existing publish button.

## Files touched

- `supabase/functions/c3-config-sync-publish/index.ts` — diagnostic logging (step 1), can be removed or kept after fix.
- `src/hooks/useC3ConfigPublish.ts` — mirror-truncate / omit the offending field in `buildSyncPayload()` (step 2).
- `docs/C3_WIZARD_SYNC_ENDPOINT_UPDATE_REQUIRED.md` — note the constraint (step 4).
